import uuid
from typing import List, Dict, Any, Optional
import database

class ConversationMemory:
    """
    User-isolated multi-turn conversation memory for LocalGPT Pro.
    Guarantees every chat and message is isolated to the authenticated user (uid).
    """
    def __init__(self, uid: str, chat_id: Optional[str] = None):
        self.uid = uid
        self.chat_id = chat_id or str(uuid.uuid4())
        self.messages: List[Dict[str, Any]] = []
        self.title: str = "New Chat"
        self.load_or_create()

    def load_or_create(self):
        chat = database.get_chat(self.uid, self.chat_id)
        if chat:
            self.title = chat.get("title", "New Chat")
            self.messages = database.get_chat_messages(self.chat_id)
        else:
            database.create_chat(self.uid, self.chat_id, self.title)
            self.messages = []

    def add_message(self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        msg_id = str(uuid.uuid4())
        sources = (metadata or {}).get("sources", [])
        
        msg = {
            "id": msg_id,
            "role": role,
            "content": content,
            "metadata": metadata or {}
        }
        self.messages.append(msg)
        
        # Persist to database
        database.add_message(self.uid, self.chat_id, msg_id, role, content, sources=sources)

        # Auto-generate title on first user message if still default
        if self.title in ["New Chat", "Untitled"] and role == "user":
            clean_title = content.strip().split("\n")[0][:36]
            if len(content.strip().split("\n")[0]) > 36:
                clean_title += "..."
            self.title = clean_title or "Chat"
            database.rename_chat(self.uid, self.chat_id, self.title)

        return msg_id

    def get_messages(self) -> List[Dict[str, Any]]:
        return self.messages

    def get_context_messages(self, system_prompt: Optional[str] = None, max_turns: int = 10) -> List[Dict[str, str]]:
        context: List[Dict[str, str]] = []
        if system_prompt:
            context.append({"role": "system", "content": system_prompt})

        recent = self.messages[-max_turns*2:] if max_turns > 0 else self.messages
        for m in recent:
            if m["role"] in ["user", "assistant", "system"]:
                context.append({"role": m["role"], "content": m["content"]})
        return context

    def update_message(self, message_index: int, new_content: str):
        if 0 <= message_index < len(self.messages):
            msg = self.messages[message_index]
            msg_id = msg["id"]
            # Truncate subsequent messages in database
            database.truncate_messages_after(self.chat_id, msg_id)
            # Update memory buffer
            self.messages[message_index]["content"] = new_content
            self.messages = self.messages[:message_index + 1]

    def remove_last_assistant_message(self) -> Optional[Dict[str, Any]]:
        if self.messages and self.messages[-1]["role"] == "assistant":
            removed = self.messages.pop()
            # Truncate in DB to preceding message
            if self.messages:
                database.truncate_messages_after(self.chat_id, self.messages[-1]["id"])
            return removed
        return None

    def rename(self, new_title: str):
        self.title = new_title
        database.rename_chat(self.uid, self.chat_id, new_title)

    def delete(self):
        database.delete_chat(self.uid, self.chat_id)
        self.messages = []

    @classmethod
    def list_all(cls, uid: str, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        return database.list_chats(uid, search_query=search_query)

    @classmethod
    def delete_chat_by_id(cls, uid: str, chat_id: str):
        database.delete_chat(uid, chat_id)

    @classmethod
    def toggle_pin(cls, uid: str, chat_id: str) -> bool:
        return database.toggle_pin_chat(uid, chat_id)
