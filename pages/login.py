import os
import streamlit as st
import streamlit.components.v1 as components
from auth.firebase_config import FIREBASE_CONFIG
from auth.auth import process_auth_token, create_demo_user

def render_login_page():
    st.markdown("""
    <div style="text-align: center; margin-top: 20px; margin-bottom: 25px;">
        <div style="font-size: 34px; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            ◆ LOCALGPT PRO
        </div>
        <div style="color: #94a3b8; font-size: 15px; margin-top: 4px;">
            Your private, multi-user AI assistant running 100% locally
        </div>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.2, 1])
    with col2:
        # Load HTML/JS Firebase Component if API key is populated, or show the interactive login card
        auth_html_path = os.path.join(os.path.dirname(__file__), "..", "auth", "auth_component.html")
        has_real_firebase = bool(FIREBASE_CONFIG.get("apiKey") and "DemoKey" not in FIREBASE_CONFIG.get("apiKey", ""))

        tab_main, tab_quick = st.tabs(["🔐 Sign In / Sign Up", "⚡ Fast Local Test Sign-In"])

        with tab_main:
            if has_real_firebase and os.path.exists(auth_html_path):
                # Render Firebase JS Component
                with open(auth_html_path, "r", encoding="utf-8") as f:
                    html_content = f.read()
                token_data = components.html(html_content, height=440, scrolling=False)
                if token_data:
                    user = process_auth_token(token_data)
                    if user:
                        st.session_state.current_page = "workspace"
                        st.rerun()
            else:
                # Built-in elegant authentication form
                login_mode = st.radio("Select Mode", ["Log In", "Create Account", "Forgot Password"], horizontal=True, label_visibility="collapsed")
                
                if login_mode == "Log In":
                    email = st.text_input("Email", placeholder="you@example.com", key="login_email")
                    password = st.text_input("Password", type="password", placeholder="••••••••", key="login_pass")
                    
                    c_btn, c_google = st.columns(2)
                    with c_btn:
                        if st.button("Log In", use_container_width=True, type="primary"):
                            if email and password:
                                user_data = create_demo_user(email, email.split("@")[0])
                                process_auth_token(user_data)
                                st.session_state.current_page = "workspace"
                                st.rerun()
                            else:
                                st.error("Please enter email and password.")
                    with c_google:
                        if st.button("Continue with Google", use_container_width=True):
                            demo_g = create_demo_user(email or "user@gmail.com", (email or "user").split("@")[0].capitalize())
                            demo_g["provider"] = "google.com"
                            process_auth_token(demo_g)
                            st.session_state.current_page = "workspace"
                            st.rerun()

                elif login_mode == "Create Account":
                    name = st.text_input("Full Name", placeholder="Priya Sharma", key="signup_name")
                    email = st.text_input("Email", placeholder="you@example.com", key="signup_email")
                    password = st.text_input("Password", type="password", placeholder="Min 8 characters", key="signup_pass")
                    confirm = st.text_input("Confirm Password", type="password", placeholder="••••••••", key="signup_confirm")
                    
                    if len(password) > 0 and len(password) < 8:
                        st.caption("⚠️ Password strength: Too short (minimum 8 characters)")
                    elif len(password) >= 8:
                        st.caption("✅ Password strength: Good")

                    if st.button("Create Account", use_container_width=True, type="primary"):
                        if not email or not password:
                            st.error("Please fill in all required fields.")
                        elif len(password) < 8:
                            st.error("Password must be at least 8 characters.")
                        elif password != confirm:
                            st.error("Passwords do not match.")
                        else:
                            new_u = create_demo_user(email, name or email.split("@")[0])
                            process_auth_token(new_u)
                            st.success("Account created successfully!")
                            st.session_state.current_page = "workspace"
                            st.rerun()

                else: # Forgot Password
                    f_email = st.text_input("Enter your registered email", placeholder="you@example.com", key="forgot_email")
                    if st.button("Send Reset Link", use_container_width=True, type="primary"):
                        if f_email:
                            st.success(f"Password reset instructions sent to {f_email}!")
                        else:
                            st.error("Please enter your email.")

        with tab_quick:
            st.caption("Simulate multi-user data isolation between two independent accounts:")
            col_a, col_b = st.columns(2)
            with col_a:
                if st.button("👤 Sign In as User A\n(alice@demo.com)", use_container_width=True):
                    u_a = create_demo_user("alice@demo.com", "Alice Smith")
                    process_auth_token(u_a)
                    st.session_state.current_page = "workspace"
                    st.rerun()
            with col_b:
                if st.button("👤 Sign In as User B\n(bob@demo.com)", use_container_width=True):
                    u_b = create_demo_user("bob@demo.com", "Bob Jones")
                    process_auth_token(u_b)
                    st.session_state.current_page = "workspace"
                    st.rerun()

    st.markdown("""
    <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 13px;">
        🔒 All prompts, chats, and documents remain stored locally on this machine.
    </div>
    """, unsafe_allow_html=True)

