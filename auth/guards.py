import streamlit as st

def require_login():
    """
    Guards protected pages.
    Redirects to login if user is not authenticated.
    """
    user = st.session_state.get("user")
    if not user or "uid" not in user:
        if hasattr(st, "switch_page"):
            try:
                st.switch_page("pages/login.py")
            except Exception:
                st.session_state.current_page = "login"
                st.rerun()
        else:
            st.session_state.current_page = "login"
            st.rerun()
        st.stop()
    return user

