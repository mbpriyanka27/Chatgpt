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
    default_sys_prompt = user_row.get("default_system_prompt") or "You are a helpful AI assistant. Explain concepts clearly with examples."

    # -------------------------------------------------------------
    # Workspace Top Bar
    # -------------------------------------------------------------
    col_head1, col_head2, col_head3, col_head4 = st.columns([0.45, 0.20, 0.15, 0.20])

    with col_head1:
        st.subheader(f"💬 {memory.title}")

    with col_head2:
        # Per-chat RAG toggle
        answer_from_docs = st.toggle("📄 Use Documents", value=True, help="Toggle document retrieval for questions")

    with col_head3:
        # Export Popover
        with st.popover("📤 Export"):
            st.markdown("##### Export Conversation")
            msgs = memory.get_messages()
            if msgs:
                md_data = export_chat_as_markdown(uid, memory.title, msgs)
                st.download_button(
                    label="Download Markdown (.md)",
                    data=md_data,
                    file_name=f"{memory.title}.md",
                    mime="text/markdown",
                    use_container_width=True
                )
                try:
                    pdf_data = export_chat_as_pdf(uid, memory.title, msgs)
                    st.download_button(
                        label="Download PDF (.pdf)",
                        data=pdf_data,
                        file_name=f"{memory.title}.pdf",
                        mime="application/pdf",
                        use_container_width=True
                    )
                except Exception as e:
                    st.caption(f"PDF export note: {e}")
            else:
                st.caption("No messages to export yet.")

    with col_head4:
        # Chat Rename Popover
        with st.popover("✏️ Rename"):
            new_title = st.text_input("Edit Title", value=memory.title)
            if st.button("Save Title", use_container_width=True):
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
                # Editing mode for user turn
                if role == "user" and st.session_state.get("editing_msg_idx") == idx:
                    edit_val = st.text_area("Edit your message:", value=content, key=f"edit_ta_{idx}")
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

                    # Action buttons under messages
                    col_b1, col_b2, col_b3, col_b4, col_b5, _ = st.columns([0.14, 0.17, 0.16, 0.08, 0.08, 0.37])

                    if role == "user":
                        with col_b1:
                            if st.button("✏️ Edit", key=f"edit_msg_{idx}", help="Edit prompt and regenerate"):
                                st.session_state.editing_msg_idx = idx
                                st.rerun()
                    elif role == "assistant":
                        with col_b1:
                            with st.popover("📋 Copy"):
                                st.text_area("Copy text", value=content, height=120)
                        with col_b2:
                            if st.button("🔄 Regenerate", key=f"regen_msg_{idx}"):
                                memory.remove_last_assistant_message()
                                st.session_state.regenerate_flag = True
                                st.rerun()
                        with col_b3:
                            if st.button("🔬 X-Ray", key=f"xray_msg_{idx}", help="Inspect transformer internals"):
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

    # Show inline X-Ray drawer if triggered
    if st.session_state.get("show_inline_xray") and st.session_state.get("xray_data"):
        render_xray_drawer(st.session_state.xray_data, model, tokenizer)

    # -------------------------------------------------------------
    # Input Processing & Streaming
    # -------------------------------------------------------------
    user_input = st.chat_input("Ask anything... (or upload documents from sidebar)")
    
    # Check if a suggested prompt card was clicked
    if st.session_state.get("suggested_prompt"):
        user_input = st.session_state.pop("suggested_prompt")

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
                    max_new_tokens=int(user_settings.get("max_tokens", 512)),
                    temperature=float(user_settings.get("temperature", 0.7)),
                    top_p=float(user_settings.get("top_p", 0.9)),
                    top_k=int(user_settings.get("top_k", 50))
                )
                response = st.write_stream(streamer)
                thread.join()

            memory.add_message("assistant", response, metadata={"sources": ret_sources})
            st.session_state.xray_target_text = prompt_to_run
            st.session_state.xray_data = analyze_input_internals(model, tokenizer, prompt_to_run)
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
                max_new_tokens=int(user_settings.get("max_tokens", 512)),
                temperature=float(user_settings.get("temperature", 0.7)),
                top_p=float(user_settings.get("top_p", 0.9)),
                top_k=int(user_settings.get("top_k", 50))
            )
            response = st.write_stream(streamer)
            thread.join()

        memory.add_message("assistant", response, metadata={"sources": ret_sources})
        st.session_state.xray_target_text = user_input
        st.session_state.xray_data = analyze_input_internals(model, tokenizer, user_input)
        st.rerun()

