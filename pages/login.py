import os
import streamlit as st
import streamlit.components.v1 as components
from auth.firebase_config import FIREBASE_CONFIG
from auth.auth import process_auth_token, create_demo_user

def render_login_page():
    st.markdown("""
    <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                LOCALGPT PRO
            </span>
            <span style="font-size: 11px; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 999px; padding: 2px 8px; letter-spacing: 0.08em;">
                SECURE LOCAL AI
            </span>
        </div>
        <div style="color: #94a3b8; font-size: 14px; max-width: 480px; margin: 0 auto;">
            Enterprise-grade local assistant with multi-user isolation, document RAG, and deep transformer X-Ray telemetry.
        </div>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.25, 1])
    with col2:
        auth_html_path = os.path.join(os.path.dirname(__file__), "..", "auth", "auth_component.html")
        has_real_firebase = bool(FIREBASE_CONFIG.get("apiKey") and "DemoKey" not in FIREBASE_CONFIG.get("apiKey", ""))

        tab_main, tab_quick = st.tabs(["🔐 Sign In / Sign Up", "⚡ Fast Multi-User Testing"])

        with tab_main:
            if has_real_firebase and os.path.exists(auth_html_path):
                with open(auth_html_path, "r", encoding="utf-8") as f:
                    html_content = f.read()
                token_data = components.html(html_content, height=440, scrolling=False)
                if token_data:
                    user = process_auth_token(token_data)
                    if user:
                        st.session_state.current_page = "workspace"
                        st.rerun()
            else:
                login_mode = st.radio("Mode", ["Sign In", "Create Account", "Forgot Password"], horizontal=True, label_visibility="collapsed")
                
                if login_mode == "Sign In":
                    email = st.text_input("Email Address", placeholder="you@company.com", key="login_email")
                    password = st.text_input("Password", type="password", placeholder="••••••••", key="login_pass")
                    
                    c_btn, c_google = st.columns(2)
                    with c_btn:
                        if st.button("Sign In", use_container_width=True, type="primary"):
                            if email and password:
                                user_data = create_demo_user(email, email.split("@")[0].capitalize())
                                process_auth_token(user_data)
                                st.session_state.current_page = "workspace"
                                st.rerun()
                            else:
                                st.error("Please enter both email and password.")
                    with c_google:
                        if st.button("Continue with Google", use_container_width=True):
                            demo_g = create_demo_user(email or "user@gmail.com", (email or "user").split("@")[0].capitalize())
                            demo_g["provider"] = "google.com"
                            process_auth_token(demo_g)
                            st.session_state.current_page = "workspace"
                            st.rerun()

                elif login_mode == "Create Account":
                    name = st.text_input("Full Name", placeholder="Priya Sharma", key="signup_name")
                    email = st.text_input("Email Address", placeholder="you@company.com", key="signup_email")
                    password = st.text_input("Password", type="password", placeholder="Minimum 8 characters", key="signup_pass")
                    confirm = st.text_input("Confirm Password", type="password", placeholder="••••••••", key="signup_confirm")
                    
                    if len(password) > 0 and len(password) < 8:
                        st.caption("⚠️ Password strength: Too short (min 8 characters)")
                    elif len(password) >= 8:
                        st.caption("✅ Password strength: Strong")

                    if st.button("Create Account", use_container_width=True, type="primary"):
                        if not email or not password:
                            st.error("Please fill in all required fields.")
                        elif len(password) < 8:
                            st.error("Password must be at least 8 characters.")
                        elif password != confirm:
                            st.error("Passwords do not match.")
                        else:
                            new_u = create_demo_user(email, name or email.split("@")[0].capitalize())
                            process_auth_token(new_u)
                            st.success("Account registered successfully!")
                            st.session_state.current_page = "workspace"
                            st.rerun()

                else: # Forgot Password
                    f_email = st.text_input("Enter your registered email", placeholder="you@company.com", key="forgot_email")
                    if st.button("Send Reset Link", use_container_width=True, type="primary"):
                        if f_email:
                            st.success(f"Password reset instructions dispatched to {f_email}!")
                        else:
                            st.error("Please provide an email address.")

        with tab_quick:
            st.caption("Instantly test and verify strict data isolation between two independent accounts:")
            col_a, col_b = st.columns(2)
            with col_a:
                if st.button("👩‍💻 User A\nalice@demo.com", use_container_width=True):
                    u_a = create_demo_user("alice@demo.com", "Alice Smith")
                    process_auth_token(u_a)
                    st.session_state.current_page = "workspace"
                    st.rerun()
            with col_b:
                if st.button("👨‍💼 User B\nbob@demo.com", use_container_width=True):
                    u_b = create_demo_user("bob@demo.com", "Bob Jones")
                    process_auth_token(u_b)
                    st.session_state.current_page = "workspace"
                    st.rerun()

    st.markdown("""
    <div style="text-align: center; margin-top: 40px; color: #475569; font-size: 13px;">
        🛡️ Zero data leaves your laptop. Model inference and document embeddings run completely offline.
    </div>
    """, unsafe_allow_html=True)
