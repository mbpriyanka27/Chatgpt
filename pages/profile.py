import streamlit as st
import database
from auth.guards import require_login
from auth.auth import logout

def render_profile_page():
    user = require_login()
    uid = user["uid"]
    db_user = database.get_user(uid) or user
    settings = database.get_user_settings(uid)

    st.markdown("### 👤 **Profile & Preferences**")
    st.caption("Manage your account details, default model hyper-parameters, and user privacy.")

    col1, col2 = st.columns([0.4, 0.6])

    # Left: User Card & Display Name
    with col1:
        st.markdown("#### Account Information")
        st.markdown(f"**Email:** `{db_user.get('email')}`")
        st.markdown(f"**Sign-in Provider:** `{db_user.get('provider', 'password')}`")
        st.markdown(f"**User ID:** `{uid[:14]}...`")
        st.markdown(f"**Member Since:** `{db_user.get('created_at', '')[:10]}`")

        new_name = st.text_input("Display Name", value=db_user.get("display_name") or user.get("name", ""))
        new_theme = st.selectbox("Theme Mode", ["dark", "light"], index=0 if db_user.get("theme") == "dark" else 1)

        if st.button("Save Profile Info", type="primary"):
            database.update_user_profile(uid, display_name=new_name, theme=new_theme)
            st.session_state.user["name"] = new_name
            st.session_state.theme = new_theme
            st.success("Profile updated successfully!")
            st.rerun()

    # Right: Default Generation Settings
    with col2:
        st.markdown("#### Default Generation Controls")
        st.caption("These parameters are saved specifically to your account profile.")

        default_sys = st.text_area(
            "Default System Prompt",
            value=db_user.get("default_system_prompt") or "You are a helpful AI assistant. Explain concepts clearly with examples."
        )

        temp = st.slider("Default Temperature", 0.0, 1.5, float(settings.get("temperature", 0.7)), step=0.05)
        top_k = st.slider("Default Top-K", 1, 100, int(settings.get("top_k", 50)), step=1)
        top_p = st.slider("Default Top-P", 0.0, 1.0, float(settings.get("top_p", 0.9)), step=0.05)
        max_tok = st.slider("Default Max Tokens", 16, 1024, int(settings.get("max_tokens", 512)), step=16)

        if st.button("Save Generation Settings"):
            database.update_user_settings(uid, temp, top_k, top_p, max_tok)
            database.update_user_profile(uid, default_system_prompt=default_sys)
            st.success("Settings saved to your profile!")

    st.markdown("---")

    # Danger Zone: Data Erasure
    st.markdown("#### ⚠️ Danger Zone")
    cdel1, cdel2 = st.columns(2)

    with cdel1:
        st.markdown("**Delete All My Chats**")
        st.caption("Irreversibly deletes all conversation history from your workspace.")
        if st.button("🗑️ Delete All Chats", type="secondary"):
            database.delete_all_user_chats(uid)
            st.success("All chats have been wiped.")
            st.rerun()

    with cdel2:
        st.markdown("**Delete My Account**")
        st.caption("Erases your user profile, all chats, all uploaded documents, and private FAISS vector indices.")
        if st.button("🚨 Delete My Entire Account"):
            database.delete_user_account(uid)
            logout()
            st.session_state.current_page = "login"
            st.success("Account and private data permanently deleted.")
            st.rerun()

    st.markdown("---")
    if st.button("← Back to Workspace"):
        st.session_state.current_page = "workspace"
        st.rerun()

