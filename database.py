import os
import json
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
USERS_DIR = os.path.join(DATA_DIR, "users")
os.makedirs(USERS_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "localgpt.db")

def get_user_dir(uid: str, subfolder: str = "") -> str:
    """Returns absolute path to user-isolated directory (documents, faiss_index, exports)."""
    clean_uid = "".join(c for c in uid if c.isalnum() or c in ("-", "_"))
    path = os.path.join(USERS_DIR, clean_uid, subfolder)
    os.makedirs(path, exist_ok=True)
    return path

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            display_name TEXT,
            photo_url TEXT,
            provider TEXT DEFAULT 'password',
            created_at TEXT NOT NULL,
            last_login TEXT NOT NULL,
            theme TEXT DEFAULT 'dark',
            default_system_prompt TEXT DEFAULT 'You are a helpful AI assistant. Explain concepts clearly with examples.'
        )
    """)

    # 2. chats table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chats (
            chat_id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            title TEXT NOT NULL,
            pinned INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
        )
    """)

    # 3. messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            message_id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            sources_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE
        )
    """)

    # 4. documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            doc_id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            filename TEXT NOT NULL,
            pages INTEGER DEFAULT 1,
            chunks INTEGER DEFAULT 0,
            uploaded_at TEXT NOT NULL,
            FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
        )
    """)

    # 5. settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            uid TEXT PRIMARY KEY,
            temperature REAL DEFAULT 0.7,
            top_k INTEGER DEFAULT 50,
            top_p REAL DEFAULT 0.9,
            max_tokens INTEGER DEFAULT 512,
            FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

init_db()

# -------------------------------------------------------------
# User Operations
# -------------------------------------------------------------
def upsert_user(uid: str, email: str, display_name: Optional[str] = None, photo_url: Optional[str] = None, provider: str = "password") -> Dict[str, Any]:
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE uid = ?", (uid,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE users
            SET last_login = ?,
                display_name = COALESCE(?, display_name),
                photo_url = COALESCE(?, photo_url)
            WHERE uid = ?
        """, (now, display_name, photo_url, uid))
    else:
        cursor.execute("""
            INSERT INTO users (uid, email, display_name, photo_url, provider, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (uid, email, display_name or email.split("@")[0], photo_url, provider, now, now))
        
        # Insert default settings
        cursor.execute("""
            INSERT OR IGNORE INTO settings (uid, temperature, top_k, top_p, max_tokens)
            VALUES (?, 0.7, 50, 0.9, 512)
        """, (uid,))

    conn.commit()
    cursor.execute("SELECT * FROM users WHERE uid = ?", (uid,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

def get_user(uid: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE uid = ?", (uid,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_profile(uid: str, display_name: Optional[str] = None, theme: Optional[str] = None, default_system_prompt: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if display_name is not None:
        cursor.execute("UPDATE users SET display_name = ? WHERE uid = ?", (display_name, uid))
    if theme is not None:
        cursor.execute("UPDATE users SET theme = ? WHERE uid = ?", (theme, uid))
    if default_system_prompt is not None:
        cursor.execute("UPDATE users SET default_system_prompt = ? WHERE uid = ?", (default_system_prompt, uid))
    conn.commit()
    conn.close()

def delete_user_account(uid: str):
    """Deletes all user data from database and deletes user data folder."""
    import shutil
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE chat_id IN (SELECT chat_id FROM chats WHERE uid = ?)", (uid,))
    cursor.execute("DELETE FROM chats WHERE uid = ?", (uid,))
    cursor.execute("DELETE FROM documents WHERE uid = ?", (uid,))
    cursor.execute("DELETE FROM settings WHERE uid = ?", (uid,))
    cursor.execute("DELETE FROM users WHERE uid = ?", (uid,))
    conn.commit()
    conn.close()

    user_folder = os.path.join(USERS_DIR, "".join(c for c in uid if c.isalnum() or c in ("-", "_")))
    if os.path.exists(user_folder):
        try:
            shutil.rmtree(user_folder)
        except Exception as e:
            print(f"Error removing user directory: {e}")

# -------------------------------------------------------------
# Chat Operations (Filtered by uid)
# -------------------------------------------------------------
def create_chat(uid: str, chat_id: str, title: str = "New Chat") -> Dict[str, Any]:
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO chats (chat_id, uid, title, pinned, created_at, updated_at)
        VALUES (?, ?, ?, 0, ?, ?)
    """, (chat_id, uid, title, now, now))
    conn.commit()
    conn.close()
    return {"chat_id": chat_id, "uid": uid, "title": title, "pinned": 0, "created_at": now, "updated_at": now}

def list_chats(uid: str, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if search_query:
        cursor.execute("""
            SELECT * FROM chats
            WHERE uid = ? AND title LIKE ?
            ORDER BY pinned DESC, updated_at DESC
        """, (uid, f"%{search_query}%"))
    else:
        cursor.execute("""
            SELECT * FROM chats
            WHERE uid = ?
            ORDER BY pinned DESC, updated_at DESC
        """, (uid,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_chat(uid: str, chat_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chats WHERE chat_id = ? AND uid = ?", (chat_id, uid))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def rename_chat(uid: str, chat_id: str, new_title: str):
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE chats SET title = ?, updated_at = ? WHERE chat_id = ? AND uid = ?", (new_title, now, chat_id, uid))
    conn.commit()
    conn.close()

def toggle_pin_chat(uid: str, chat_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT pinned FROM chats WHERE chat_id = ? AND uid = ?", (chat_id, uid))
    row = cursor.fetchone()
    if row:
        new_pinned = 0 if row["pinned"] else 1
        cursor.execute("UPDATE chats SET pinned = ? WHERE chat_id = ? AND uid = ?", (new_pinned, chat_id, uid))
        conn.commit()
        conn.close()
        return bool(new_pinned)
    conn.close()
    return False

def delete_chat(uid: str, chat_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
    cursor.execute("DELETE FROM chats WHERE chat_id = ? AND uid = ?", (chat_id, uid))
    conn.commit()
    conn.close()

def delete_all_user_chats(uid: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE chat_id IN (SELECT chat_id FROM chats WHERE uid = ?)", (uid,))
    cursor.execute("DELETE FROM chats WHERE uid = ?", (uid,))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Messages Operations
# -------------------------------------------------------------
def get_chat_messages(chat_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC", (chat_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        m = dict(r)
        sources = json.loads(m["sources_json"]) if m.get("sources_json") else []
        result.append({
            "id": m["message_id"],
            "role": m["role"],
            "content": m["content"],
            "metadata": {"sources": sources},
            "created_at": m["created_at"]
        })
    return result

def add_message(uid: str, chat_id: str, message_id: str, role: str, content: str, sources: Optional[List[Dict[str, Any]]] = None):
    now = datetime.now().isoformat()
    sources_json = json.dumps(sources) if sources else None
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO messages (message_id, chat_id, role, content, sources_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (message_id, chat_id, role, content, sources_json, now))

    # Update chat updated_at
    cursor.execute("UPDATE chats SET updated_at = ? WHERE chat_id = ? AND uid = ?", (now, chat_id, uid))
    conn.commit()
    conn.close()

def truncate_messages_after(chat_id: str, message_id: str):
    """Deletes messages after a given message_id for regenerating or editing turns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT created_at FROM messages WHERE message_id = ?", (message_id,))
    target = cursor.fetchone()
    if target:
        target_time = target["created_at"]
        cursor.execute("DELETE FROM messages WHERE chat_id = ? AND created_at > ?", (chat_id, target_time))
        conn.commit()
    conn.close()

# -------------------------------------------------------------
# Documents Operations (Filtered by uid)
# -------------------------------------------------------------
def add_document(uid: str, doc_id: str, filename: str, pages: int, chunks: int):
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO documents (doc_id, uid, filename, pages, chunks, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (doc_id, uid, filename, pages, chunks, now))
    conn.commit()
    conn.close()

def list_documents(uid: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE uid = ? ORDER BY uploaded_at DESC", (uid,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_document(uid: str, doc_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE doc_id = ? AND uid = ?", (doc_id, uid))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Settings Operations (Filtered by uid)
# -------------------------------------------------------------
def get_user_settings(uid: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settings WHERE uid = ?", (uid,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"uid": uid, "temperature": 0.7, "top_k": 50, "top_p": 0.9, "max_tokens": 512}

def update_user_settings(uid: str, temperature: float, top_k: int, top_p: float, max_tokens: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO settings (uid, temperature, top_k, top_p, max_tokens)
        VALUES (?, ?, ?, ?, ?)
    """, (uid, temperature, top_k, top_p, max_tokens))
    conn.commit()
    conn.close()
