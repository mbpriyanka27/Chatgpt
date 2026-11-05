import os
import uuid
import streamlit as st
from memory import ConversationMemory
from rag import RAGPipeline
from chat import ChatEngine
from xray import analyze_input_internals
from export import export_chat_as_markdown, export_chat_as_pdf
from ui.components import render_welcome_screen, render_source_chips, render_xray_drawer
import database
from auth.guards import require_login

def render_workspace_page(model, tokenizer):
    user = require_login()
    uid = user["uid"]

    # Initialize user-isolated memory and RAG
    if "current_chat_id" not in st.session_state or not st.session_state.current_chat_id:
        st.session_state.current_chat_id = str(uuid.uuid4())

    memory = ConversationMemory(uid=uid, chat_id=st.session_state.current_chat_id)
    rag_pipe = RAGPipeline(uid=uid)
    chat_engine = ChatEngine(model, tokenizer, rag_pipe)

    # Load user default settings from DB
    user_settings = database.get_user_settings(uid)
    user_row = database.get_user(uid) or {}
    default_sys_prompt = user_row.get("default_system_prompt") or "You are a helpful AI assistant. Answer accurately, clearly and concisely."

    # -------------------------------------------------------------
    # Workspace Top Bar: Generous spacing, clean alignment
    # -------------------------------------------------------------
    col_left, col_right = st.columns([0.62, 0.38])

    with col_left:
        st.markdown(f"<h3 style='margin: 0; padding: 0; font-size: 20px; font-weight: 700; line-height: 1.3;'>💬 {memory.title}</h3>", unsafe_allow_html=True)

    with col_right:
        c_rag, c_exp, c_ren = st.columns([0.48, 0.26, 0.26])
        with c_rag:
            answer_from_docs = st.toggle("📄 Use Docs", value=True, help="Toggle document RAG retrieval")
        with c_exp:
            with st.popover("📤 Export"):
                st.markdown("##### Export Conversation")
                msgs = memory.get_messages()
                if msgs:
                    md_data = export_chat_as_markdown(uid, memory.title, msgs)
                    st.download_button(
                        label="Markdown (.md)",
                        data=md_data,
                        file_name=f"{memory.title}.md",
                        mime="text/markdown",
                        use_container_width=True
                    )
                    try:
                        pdf_data = export_chat_as_pdf(uid, memory.title, msgs)
                        st.download_button(
                            label="PDF (.pdf)",
                            data=pdf_data,
                            file_name=f"{memory.title}.pdf",
                            mime="application/pdf",
                            use_container_width=True
                        )
                    except Exception as e:
                        st.caption(f"PDF note: {e}")
                else:
                    st.caption("No messages to export yet.")
        with c_ren:
            with st.popover("✏️ Rename"):
                new_title = st.text_input("New Title", value=memory.title)
                if st.button("Save", use_container_width=True):
                    memory.rename(new_title)
                    st.rerun()

    # -------------------------------------------------------------
    # Render Conversation Messages or Welcome Screen
    # -------------------------------------------------------------
    messages = memory.get_messages()

    if not messages:
        render_welcome_screen(user.get("name", "User"))
    else:
        for idx, msg in enumerate(messages):
            role = msg["role"]
            content = msg["content"]
            metadata = msg.get("metadata", {})

            with st.chat_message(role):
                # In-place Editing for User Message
                if role == "user" and st.session_state.get("editing_msg_idx") == idx:
                    edit_val = st.text_area("Edit message:", value=content, key=f"edit_ta_{idx}")
                    col_sv, col_cn = st.columns([0.25, 0.75])
                    with col_sv:
                        if st.button("Save & Resubmit", key=f"btn_sv_{idx}", type="primary"):
                            memory.update_message(idx, edit_val)
                            st.session_state.editing_msg_idx = None
                            st.session_state.regenerate_flag = True
                            st.rerun()
                    with col_cn:
                        if st.button("Cancel", key=f"btn_cn_{idx}"):
                            st.session_state.editing_msg_idx = None
                            st.rerun()
                else:
                    st.markdown(content)

                    # Display source citations if RAG was used
                    sources = metadata.get("sources", [])
                    if sources:
                        render_source_chips(sources)

                    # Clean action buttons with ample breathing room
                    col_b1, col_b2, col_b3, col_b4, col_b5, _ = st.columns([0.16, 0.20, 0.18, 0.10, 0.10, 0.26])

                    if role == "user":
                        with col_b1:
                            if st.button("✏️ Edit", key=f"edit_msg_{idx}", help="Edit prompt and regenerate"):
                                st.session_state.editing_msg_idx = idx
                                st.rerun()
                    elif role == "assistant":
                        with col_b1:
                            with st.popover("📋 Copy"):
                                st.text_area("Copy Text", value=content, height=120)
                        with col_b2:
                            if st.button("🔄 Regenerate", key=f"regen_msg_{idx}"):
                                memory.remove_last_assistant_message()
                                st.session_state.regenerate_flag = True
                                st.rerun()
                        with col_b3:
                            if st.button("🔬 X-Ray", key=f"xray_msg_{idx}", help="Inspect internal representations"):
                                prior_prompt = messages[idx-1]["content"] if idx > 0 else content
                                st.session_state.xray_target_text = prior_prompt
                                with st.spinner("Analyzing transformer internals..."):
                                    st.session_state.xray_data = analyze_input_internals(model, tokenizer, prior_prompt)
                                st.session_state.show_inline_xray = True
                                st.rerun()
                        with col_b4:
                            st.button("👍", key=f"thumbs_up_{idx}", help="Helpful response")
                        with col_b5:
                            st.button("👎", key=f"thumbs_down_{idx}", help="Needs improvement")

    # Show inline X-Ray drawer when explicitly opened
    if st.session_state.get("show_inline_xray") and st.session_state.get("xray_data"):
        render_xray_drawer(st.session_state.xray_data, model, tokenizer)

    # -------------------------------------------------------------
    # Chat Input & Fast Streaming Execution
    # -------------------------------------------------------------
    user_input = st.chat_input("Ask anything... (or upload documents from sidebar)")
    
    if st.session_state.get("suggested_prompt"):
        user_input = st.session_state.pop("suggested_prompt")

    # Dynamic token budget for snappy CPU inference (default 150 tokens)
    token_limit = min(int(user_settings.get("max_tokens", 150)), 200)

    # Handle Regeneration
    if st.session_state.get("regenerate_flag"):
        st.session_state.regenerate_flag = False
        last_msgs = memory.get_messages()
        if last_msgs and last_msgs[-1]["role"] == "user":
            prompt_to_run = last_msgs[-1]["content"]

            prior_mem = ConversationMemory(uid=uid, chat_id=st.session_state.current_chat_id)
            prior_mem.messages = last_msgs[:-1]

            ctx_msgs, ret_sources = chat_engine.prepare_turn(
                prior_mem,
                prompt_to_run,
                system_prompt=default_sys_prompt,
                use_rag_if_available=answer_from_docs
            )

            with st.chat_message("assistant"):
                streamer, thread = chat_engine.stream_turn(
                    ctx_msgs,
                    max_new_tokens=token_limit,
                    temperature=float(user_settings.get("temperature", 0.7)),
                    top_p=float(user_settings.get("top_p", 0.9)),
                    top_k=int(user_settings.get("top_k", 50))
                )
                response = st.write_stream(streamer)
                thread.join()

            memory.add_message("assistant", response, metadata={"sources": ret_sources})
            st.rerun()

    # Handle New Message
    elif user_input:
        with st.chat_message("user"):
            st.markdown(user_input)

        ctx_msgs, ret_sources = chat_engine.prepare_turn(
            memory,
            user_input,
            system_prompt=default_sys_prompt,
            use_rag_if_available=answer_from_docs
        )

        memory.add_message("user", user_input)

        with st.chat_message("assistant"):
            streamer, thread = chat_engine.stream_turn(
                ctx_msgs,
                max_new_tokens=token_limit,
                temperature=float(user_settings.get("temperature", 0.7)),
                top_p=float(user_settings.get("top_p", 0.9)),
                top_k=int(user_settings.get("top_k", 50))
            )
            response = st.write_stream(streamer)
            thread.join()

        memory.add_message("assistant", response, metadata={"sources": ret_sources})
        st.rerun()
