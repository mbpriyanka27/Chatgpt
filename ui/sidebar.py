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
        # App branding
        st.markdown("""
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <span style="font-size:22px; font-weight:800; background:linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">LOCALGPT</span>
            <span style="font-size:11px; font-weight:700; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); border-radius:999px; padding:1px 6px;">PRO</span>
        </div>
        """, unsafe_allow_html=True)

        # + New Chat button
        if st.button("➕ New Chat", use_container_width=True, type="primary"):
            st.session_state.current_chat_id = str(uuid.uuid4())
            st.session_state.xray_data = None
            st.session_state.xray_target_text = None
            st.session_state.editing_msg_idx = None
            st.session_state.regenerate_flag = False
            st.session_state.current_page = "workspace"
            st.rerun()

        # Search chats input
        search_query = st.text_input("🔍 Search chats", placeholder="Filter by title... (Ctrl+K)", key="search_chats_input")

        # Chat List
        all_chats = ConversationMemory.list_all(uid, search_query=search_query)
        grouped = group_chats(all_chats)

        for grp_name, c_list in grouped.items():
            if c_list:
                icon = "📌 " if grp_name == "Pinned" else ""
                st.markdown(f"<div style='font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin:14px 0 4px 0;'>{icon}{grp_name}</div>", unsafe_allow_html=True)
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

        # Quick Navigation Links
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
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:50%; background:#0284c7; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px;">
                    {initials}
                </div>
                <div style="overflow:hidden;">
                    <div style="font-size:13px; font-weight:600; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{user_name}</div>
                    <div style="font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{user_email}</div>
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

