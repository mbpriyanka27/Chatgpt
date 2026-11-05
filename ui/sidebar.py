import uuid
from datetime import datetime, date, timedelta
import streamlit as st
from memory import ConversationMemory
import database
from auth.auth import logout

def group_chats(chats):
    groups = {"Pinned": [], "Today": [], "Yesterday": [], "Previous 7 days": [], "Older": []}
    today = date.today()
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)

    for c in chats:
        if c.get("pinned"):
            groups["Pinned"].append(c)
            continue

        try:
            up_dt = datetime.fromisoformat(c["updated_at"]).date()
            if up_dt == today:
                groups["Today"].append(c)
            elif up_dt == yesterday:
                groups["Yesterday"].append(c)
            elif up_dt >= week_ago:
                groups["Previous 7 days"].append(c)
            else:
                groups["Older"].append(c)
        except Exception:
            groups["Older"].append(c)
    return groups

def render_sidebar(user: dict):
    uid = user["uid"]

    with st.sidebar:
        # App branding: Clean layout with zero font crowding
        st.markdown("""
        <div style="display: flex; align-items: center; gap: 10px; padding: 4px 0 14px 0; margin-bottom: 6px; border-bottom: 1px solid #1f2937;">
            <div style="font-size: 22px; font-weight: 800; line-height: 1.2; color: #38bdf8; letter-spacing: -0.5px;">
                LOCALGPT
            </div>
            <div style="font-size: 11px; font-weight: 700; line-height: 1.2; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; padding: 2px 6px;">
                PRO
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Model Speed / Performance Toggle
        st.markdown("<div style='font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;'>Inference Engine</div>", unsafe_allow_html=True)
        model_choice = st.selectbox(
            "Model",
            options=["Qwen/Qwen2.5-0.5B-Instruct (⚡ Blazing Fast)", "Qwen/Qwen2.5-1.5B-Instruct (🧠 Full Precision)"],
            index=0 if "0.5B" in st.session_state.get("model_name", "0.5B") else 1,
            label_visibility="collapsed",
            key="sb_model_choice"
        )
        target_model = "Qwen/Qwen2.5-0.5B-Instruct" if "0.5B" in model_choice else "Qwen/Qwen2.5-1.5B-Instruct"
        if target_model != st.session_state.get("model_name"):
            st.session_state.model_name = target_model
            st.rerun()

        # + New Chat button
        if st.button("➕ New Chat", use_container_width=True, type="primary"):
            st.session_state.current_chat_id = str(uuid.uuid4())
            st.session_state.xray_data = None
            st.session_state.xray_target_text = None
            st.session_state.editing_msg_idx = None
            st.session_state.regenerate_flag = False
            st.session_state.show_inline_xray = False
            st.session_state.current_page = "workspace"
            st.rerun()

        # Search chats input
        search_query = st.text_input("🔍 Search chats", placeholder="Filter chats...", key="search_chats_input")

        # Chat List
        all_chats = ConversationMemory.list_all(uid, search_query=search_query)
        grouped = group_chats(all_chats)

        for grp_name, c_list in grouped.items():
            if c_list:
                icon = "📌 " if grp_name == "Pinned" else ""
                st.markdown(f"<div style='font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin: 12px 0 4px 0;'>{icon}{grp_name}</div>", unsafe_allow_html=True)
                for chat in c_list:
                    cid = chat["chat_id"]
                    title = chat["title"] or "New Chat"
                    is_active = (cid == st.session_state.get("current_chat_id"))
                    is_pinned = bool(chat.get("pinned", 0))

                    col1, col2, col3 = st.columns([0.70, 0.15, 0.15])
                    with col1:
                        prefix = "▸ " if is_active else ""
                        if st.button(f"{prefix}{title}", key=f"sb_chat_{cid}", use_container_width=True):
                            st.session_state.current_chat_id = cid
                            st.session_state.xray_data = None
                            st.session_state.xray_target_text = None
                            st.session_state.editing_msg_idx = None
                            st.session_state.show_inline_xray = False
                            st.session_state.current_page = "workspace"
                            st.rerun()

                    with col2:
                        pin_icon = "📍" if is_pinned else "📌"
                        if st.button(pin_icon, key=f"sb_pin_{cid}", help="Pin / Unpin chat"):
                            ConversationMemory.toggle_pin(uid, cid)
                            st.rerun()

                    with col3:
                        if st.button("🗑️", key=f"sb_del_{cid}", help=f"Delete '{title}'"):
                            ConversationMemory.delete_chat_by_id(uid, cid)
                            if st.session_state.get("current_chat_id") == cid:
                                st.session_state.current_chat_id = str(uuid.uuid4())
                            st.rerun()

        st.markdown("---")

        # Documents link
        doc_count = len(database.list_documents(uid))
        if st.button(f"📁 My Documents ({doc_count})", use_container_width=True):
            st.session_state.current_page = "documents"
            st.rerun()

        # User Card at bottom
        user_name = user.get("name") or user.get("email", "").split("@")[0] or "User"
        user_email = user.get("email") or ""
        initials = "".join([part[0].upper() for part in user_name.split()[:2]]) or "U"

        st.markdown("---")
        col_u1, col_u2 = st.columns([0.75, 0.25])
        with col_u1:
            st.markdown(f"""
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; line-height: 1; flex-shrink: 0;">
                    {initials}
                </div>
                <div style="overflow: hidden;">
                    <div style="font-size: 13px; font-weight: 600; line-height: 1.2; color: #f9fafb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{user_name}</div>
                    <div style="font-size: 11px; line-height: 1.2; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{user_email}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)
        with col_u2:
            with st.popover("⚙️"):
                if st.button("👤 Profile", use_container_width=True):
                    st.session_state.current_page = "profile"
                    st.rerun()
                if st.button("🚪 Logout", use_container_width=True):
                    logout()
                    st.session_state.current_page = "login"
                    st.rerun()
