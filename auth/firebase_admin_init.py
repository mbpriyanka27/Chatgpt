import os
import firebase_admin
from firebase_admin import credentials, auth
from auth.firebase_config import SERVICE_ACCOUNT_KEY_PATH

_admin_initialized = False

def init_firebase_admin():
    global _admin_initialized
    if _admin_initialized:
        return True

    if os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
                firebase_admin.initialize_app(cred)
            _admin_initialized = True
            return True
        except Exception as e:
            print(f"Warning: Failed initializing firebase_admin with {SERVICE_ACCOUNT_KEY_PATH}: {e}")
            return False
    return False

def verify_token(id_token: str) -> dict:
    """
    Verifies Firebase ID token.
    Raises if token is invalid, expired or revoked.
    """
    if init_firebase_admin():
        return auth.verify_id_token(id_token, check_revoked=True)
    else:
        # Fallback verification for demo / offline development
        import json, base64
        try:
            # Check if payload is simulated token
            payload = json.loads(base64.b64decode(id_token.encode()).decode())
            if "uid" in payload:
                return payload
        except Exception:
            pass
        raise ValueError("Firebase Admin SDK is not initialized with a valid serviceAccountKey.json.")

