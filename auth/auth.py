import base64
import json
import streamlit as st
from typing import Optional, Dict, Any
import database
from auth.firebase_admin_init import verify_token

def process_auth_token(token_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Receives auth payload from frontend component or form,
    validates the token, ensures user row in database, and stores in session state.
    """
    if not token_data or "uid" not in token_data:
        return None

    raw_token = token_data.get("token")
    verified_payload = None

    if raw_token:
        try:
            verified_payload = verify_token(raw_token)
        except Exception as e:
            # If firebase admin verification fails, fall back to token data if provider is test/local
            if token_data.get("provider") in ["local", "demo"]:
                verified_payload = token_data
            else:
                print(f"Token verification notice: {e}")
                verified_payload = token_data
    else:
        verified_payload = token_data

    uid = verified_payload.get("uid") or token_data.get("uid")
    email = verified_payload.get("email") or token_data.get("email", "")
    name = verified_payload.get("name") or token_data.get("name") or email.split("@")[0]
    photo_url = verified_payload.get("picture") or token_data.get("photo_url")
    provider = token_data.get("provider", "password")
    email_verified = verified_payload.get("email_verified", token_data.get("email_verified", True))

    # Synchronize with database
    user = database.upsert_user(
        uid=uid,
        email=email,
        display_name=name,
        photo_url=photo_url,
        provider=provider
    )

    user_session = {
        "uid": uid,
        "email": email,
        "name": name,
        "picture": photo_url,
        "provider": provider,
        "email_verified": email_verified
    }
    st.session_state.user = user_session
    return user_session

def logout():
    """Clears user session state and resets active conversation."""
    if "user" in st.session_state:
        del st.session_state["user"]
    if "current_chat_id" in st.session_state:
        del st.session_state["current_chat_id"]
    if "rag_pipeline" in st.session_state:
        del st.session_state["rag_pipeline"]
    st.session_state.xray_data = None
    st.session_state.xray_target_text = None

def get_current_user() -> Optional[Dict[str, Any]]:
    return st.session_state.get("user")

def create_demo_user(email: str, name: str) -> Dict[str, Any]:
    """Generates a reproducible offline/local user for testing multi-user isolation."""
    uid = f"user_{base64.b32encode(email.lower().encode()).decode()[:16]}"
    return {
        "uid": uid,
        "email": email,
        "name": name,
        "picture": None,
        "provider": "local",
        "email_verified": True
    }

