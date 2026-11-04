import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
import io
import shutil

print("=== STARTING LOCALGPT PRO (PHASE 3) TEST SUITE ===")

# 1. Test Database Multi-User Isolation
print("1. Testing database.py multi-user isolation...")
import database

uid_a = "test_user_alice_111"
uid_b = "test_user_bob_222"

# Clean up before test
database.delete_user_account(uid_a)
database.delete_user_account(uid_b)

user_a = database.upsert_user(uid_a, "alice@test.com", "Alice", provider="password")
user_b = database.upsert_user(uid_b, "bob@test.com", "Bob", provider="google.com")
assert user_a["uid"] == uid_a
assert user_b["uid"] == uid_b

# User A creates a chat
chat_a = database.create_chat(uid_a, "chat_a_1", "Alice Thesis Notes")
database.add_message(uid_a, "chat_a_1", "msg_a_1", "user", "Explain self-attention")
database.add_message(uid_a, "chat_a_1", "msg_a_2", "assistant", "Self-attention computes weights...")

# User B lists chats
chats_b = database.list_chats(uid_b)
assert len(chats_b) == 0, "Security Failure: User B can see User A's chats!"

# User A lists chats
chats_a = database.list_chats(uid_a)
assert len(chats_a) == 1
assert chats_a[0]["title"] == "Alice Thesis Notes"

# Pin chat
database.toggle_pin_chat(uid_a, "chat_a_1")
chats_a_pinned = database.list_chats(uid_a)
assert chats_a_pinned[0]["pinned"] == 1

# Document isolation
database.add_document(uid_a, "doc_a_1", "alice_secret_doc.pdf", pages=10, chunks=25)
docs_b = database.list_documents(uid_b)
assert len(docs_b) == 0, "Security Failure: User B can see User A's documents!"
docs_a = database.list_documents(uid_a)
assert len(docs_a) == 1
assert docs_a[0]["filename"] == "alice_secret_doc.pdf"

print("  [OK] Multi-user data isolation strictly verified!")

# 2. Test User-Isolated Memory
print("2. Testing memory.py with user isolation...")
import memory
mem_a = memory.ConversationMemory(uid=uid_a, chat_id="chat_a_2")
mem_a.add_message("user", "What is gradient descent?")
mem_a.add_message("assistant", "Gradient descent is an optimization algorithm.")
assert len(mem_a.get_messages()) == 2
assert mem_a.title == "What is gradient descent?"

# User B should have 0 chats still
assert len(memory.ConversationMemory.list_all(uid_b)) == 0
print("  [OK] Memory isolation passed!")

# 3. Test User-Isolated RAG & FAISS
print("3. Testing rag.py per-user FAISS index...")
from rag import RAGPipeline
rag_a = RAGPipeline(uid=uid_a)
sample_text = "Transformers are deep learning architectures introduced in Attention Is All You Need." * 5
txt_stream = io.BytesIO(sample_text.encode("utf-8"))
chunks_added = rag_a.ingest_file(txt_stream, "transformer_intro.txt")
assert chunks_added > 0

results_a = rag_a.retrieve("Attention Is All You Need", top_k=1)
assert len(results_a) == 1
sources = rag_a.extract_source_references(results_a)
assert sources[0]["source"] == "transformer_intro.txt"

# Verify User B has separate empty FAISS store
rag_b = RAGPipeline(uid=uid_b)
assert rag_b.vector_store.count() == 0, "Security Failure: User B has User A's FAISS chunks!"
print("  [OK] RAG & FAISS isolation passed!")

# 4. Test Export Chats (Markdown & PDF)
print("4. Testing export.py (Markdown & PDF)...")
import export
md_output = export.export_chat_as_markdown(uid_a, "Alice Thesis Notes", mem_a.get_messages())
assert "# Alice Thesis Notes" in md_output

pdf_bytes = export.export_chat_as_pdf(uid_a, "Alice Thesis Notes", mem_a.get_messages())
assert len(pdf_bytes) > 100
assert pdf_bytes[:4] == b"%PDF"
print("  [OK] Chat export to Markdown & PDF passed!")

# 5. Test Auth Process
print("5. Testing auth.py...")
from auth.auth import process_auth_token, create_demo_user
demo_u = create_demo_user("carol@demo.com", "Carol White")
processed = process_auth_token(demo_u)
assert processed["uid"] == demo_u["uid"]
assert database.get_user(demo_u["uid"]) is not None
database.delete_user_account(demo_u["uid"])
print("  [OK] Auth pipeline passed!")

# Cleanup test users
database.delete_user_account(uid_a)
database.delete_user_account(uid_b)

print("\n=== ALL LOCALGPT PRO (PHASE 3) TESTS PASSED SUCCESSFULLY! ===")

