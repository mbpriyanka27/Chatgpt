import os
import uuid
import datetime
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean, 
    DateTime, ForeignKey, Text, func
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

load_dotenv()

# Database URL configuration: Support PostgreSQL and SQLite fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chatgpt.db")

# Fix for Heroku / Render / Supabase postgres:// to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
except Exception as e:
    print(f"Warning: Failed to connect to {DATABASE_URL}: {e}. Falling back to SQLite.")
    DATABASE_URL = "sqlite:///./chatgpt.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    display_name = Column(String(255), default="User")
    photo_url = Column(String(1024), default="")
    provider = Column(String(50), default="email")  # email, google, demo
    theme = Column(String(20), default="dark")  # dark, light
    default_system_prompt = Column(Text, default="You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully.")
    temperature = Column(Float, default=0.7)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, default=datetime.datetime.utcnow)

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New Chat")
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = Column(String(64), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    sources_json = Column(Text, default="[]")  # RAG source chips JSON
    feedback = Column(String(20), default="")   # like, dislike, empty
    tokens = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt, csv, json
    file_size = Column(Integer, default=0)
    pages_count = Column(Integer, default=1)
    chunks_count = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="documents")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(128), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)


def init_db():
    """Initializes tables in database."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

