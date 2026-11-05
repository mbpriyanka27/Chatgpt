import os
import hashlib
import secrets
import datetime
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import User, get_db

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-chatgpt-jwt-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes password with PBKDF2 HMAC-SHA256 and a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hashed password."""
    try:
        salt, key_hex = hashed_password.split(":")
        expected_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(expected_key.hex(), key_hex)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Encodes JWT access token with expiration."""
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI route guard to extract and authenticate current user from Bearer token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    return user


def seed_demo_users(db: Session):
    """Seed test demo accounts Alice and Bob for instant one-click login and testing."""
    users_data = [
        {
            "id": "user-alice-uid-101",
            "email": "alice@example.com",
            "password": "password123",
            "display_name": "Alice Cooper",
            "photo_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            "provider": "demo",
        },
        {
            "id": "user-bob-uid-102",
            "email": "bob@example.com",
            "password": "password123",
            "display_name": "Bob Williams",
            "photo_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            "provider": "demo",
        }
    ]
    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            new_user = User(
                id=u["id"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                display_name=u["display_name"],
                photo_url=u["photo_url"],
                provider=u["provider"],
            )
            db.add(new_user)
    db.commit()
