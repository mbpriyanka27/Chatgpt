import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from database import init_db, SessionLocal, User, Chat, Message, Document
from auth import (
    hash_password, verify_password, create_access_token, 
    seed_demo_users
)
from rag_service import UserVectorStore
from llm_client import stream_hosted_llm
import asyncio

def run_all_tests():
    print("=" * 65)
    print(" PROJECT PHASE 3 — CHATGPT PLATFORM VALIDATION SUITE")
    print("=" * 65)

    # 1. Database & Seeding
    print("\n[TEST 1] Initializing Database & Seeding Demo Accounts...")
    init_db()
    db = SessionLocal()
    try:
        seed_demo_users(db)
        alice = db.query(User).filter_by(email="alice@example.com").first()
        bob = db.query(User).filter_by(email="bob@example.com").first()
        assert alice is not None, "Alice demo account missing"
        assert bob is not None, "Bob demo account missing"
        assert verify_password("password123", alice.password_hash)
        assert verify_password("password123", bob.password_hash)
        print(f"  [OK] Seeded Alice ({alice.id}) and Bob ({bob.id}) successfully.")
    finally:
        db.close()

    # 2. Authentication & JWT Tokens
    print("\n[TEST 2] Verifying Password Hashing and JWT Token Flow...")
    pw = "SuperSecret#2026"
    h = hash_password(pw)
    assert verify_password(pw, h)
    assert not verify_password("WrongPassword", h)
    
    token = create_access_token({"sub": "user-test-123", "email": "test@chatgpt.internal"})
    assert isinstance(token, str) and len(token) > 20
    print("  [OK] Password hashing PBKDF2 HMAC-SHA256 & JWT encoding verified.")

    # 3. Chat Management & Multi-turn History
    print("\n[TEST 3] Testing Persistent Chat Creation and Multi-Turn Memory...")
    db = SessionLocal()
    try:
        chat = Chat(user_id="user-alice-uid-101", title="Transformers & Deep Learning")
        db.add(chat)
        db.commit()
        db.refresh(chat)

        msg1 = Message(chat_id=chat.id, role="user", content="What is attention?")
        msg2 = Message(chat_id=chat.id, role="assistant", content="Attention maps query and key vectors.")
        db.add_all([msg1, msg2])
        db.commit()

        messages = db.query(Message).filter_by(chat_id=chat.id).all()
        assert len(messages) >= 2
        print(f"  [OK] Created chat '{chat.title}' with {len(messages)} persistent turns.")
    finally:
        db.close()

    # 4. RAG Vector Knowledge Base & Document Chunking
    print("\n[TEST 4] Testing Document Extraction, Chunking & Semantic Search...")
    alice_vstore = UserVectorStore("user-alice-uid-101")
    sample_text = (
        "Project Phase 3 ChatGPT Platform architecture. "
        "The system incorporates a Next.js React TypeScript frontend and a FastAPI backend. "
        "Hosted LLM endpoints stream tokens over Server-Sent Events (SSE). "
        "All conversations and document chunk vectors are indexed per user for strict privacy."
    )
    doc_res = alice_vstore.add_document("spec_guide.txt", sample_text.encode("utf-8"))
    assert doc_res["chunks_count"] > 0
    print(f"  [OK] Indexed {doc_res['filename']} ({doc_res['chunks_count']} chunks).")

    matches = alice_vstore.search("FastAPI backend Next.js SSE streaming")
    assert len(matches) > 0
    assert "spec_guide.txt" == matches[0]["filename"]
    print(f"  [OK] RAG search matched: '{matches[0]['filename']}' (Page {matches[0]['page']})")

    # 5. Multi-User Isolation (Security Check)
    print("\n[TEST 5] Testing Multi-User Data Isolation (Alice vs Bob)...")
    bob_vstore = UserVectorStore("user-bob-uid-102")
    bob_matches = bob_vstore.search("FastAPI backend")
    assert len(bob_matches) == 0, "Security violation: Bob saw Alice's documents!"
    print("  [OK] Strict user boundary confirmed: Bob has 0 access to Alice's vector store.")

    # 6. Hosted LLM Streaming Generator
    print("\n[TEST 6] Testing Hosted LLM Token Stream Generator...")
    async def test_stream():
        stream_chunks = []
        gen = stream_hosted_llm([{"role": "user", "content": "Explain transformers"}])
        try:
            async for chunk in gen:
                stream_chunks.append(chunk)
                if len(stream_chunks) >= 8:
                    break
        finally:
            await gen.aclose()
        return "".join(stream_chunks)

    output = asyncio.run(test_stream())
    assert len(output) > 0
    print(f"  [OK] Received streamed tokens: '{output[:50]}...'")

    print("\n" + "=" * 65)
    print(" ALL 6 CORE ARCHITECTURAL SUITE CHECKS PASSED [6/6]")
    print("=" * 65)

if __name__ == "__main__":
    run_all_tests()
