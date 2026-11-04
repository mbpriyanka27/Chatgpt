import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
import io
import torch
import numpy as np

print("Testing database.py...")
import database
chat_id = "test_chat_123"
conv = database.create_conversation(chat_id, "Test Title", [{"role": "user", "content": "Hello"}])
assert conv["id"] == chat_id
loaded = database.get_conversation(chat_id)
assert loaded["title"] == "Test Title"
database.rename_conversation(chat_id, "Renamed Title")
assert database.get_conversation(chat_id)["title"] == "Renamed Title"
database.delete_conversation(chat_id)
assert database.get_conversation(chat_id) is None
print("[OK] database.py passed!")

print("Testing memory.py...")
import memory
mem = memory.ConversationMemory("test_mem_456")
mem.add_message("user", "What is Machine Learning?")
mem.add_message("assistant", "ML is a branch of AI...")
assert len(mem.get_messages()) == 2
assert mem.title == "What is Machine Learning?"
ctx = mem.get_context_messages("System instruction")
assert len(ctx) == 3
memory.ConversationMemory.delete("test_mem_456")
print("[OK] memory.py passed!")

print("Testing document_loader.py...")
import document_loader
sample_text = "Machine Learning is a subset of artificial intelligence that involves training algorithms." * 10
txt_stream = io.BytesIO(sample_text.encode("utf-8"))
chunks = document_loader.load_and_chunk_file(txt_stream, "test.txt", chunk_size=200, chunk_overlap=50)
assert len(chunks) > 0
print(f"[OK] document_loader.py passed! Extracted {len(chunks)} chunks.")

print("Testing embeddings.py & vector_store.py...")
import embeddings
import vector_store
embs = embeddings.embed_texts([c["text"] for c in chunks])
assert embs.shape[0] == len(chunks)
assert embs.shape[1] == 384
vstore = vector_store.FAISSVectorStore(dimension=384)
vstore.add_chunks(chunks, embs)
assert vstore.count() == len(chunks)

q_emb = embeddings.embed_query("artificial intelligence")
results = vstore.similarity_search(q_emb, top_k=2)
assert len(results) == 2
assert "score" in results[0]
print(f"[OK] embeddings.py & vector_store.py passed! Top score: {results[0]['score']}")

print("Testing rag.py...")
import rag
rag_pipe = rag.RAGPipeline()
txt_stream2 = io.BytesIO(b"Antigravity is an advanced agentic coding environment built for software engineering.")
rag_pipe.ingest_file(txt_stream2, "antigravity.txt")
rag_results = rag_pipe.retrieve("agentic coding", top_k=1)
assert len(rag_results) == 1
sources = rag_pipe.extract_source_references(rag_results)
assert len(sources) == 1
assert sources[0]["source"] == "antigravity.txt"
rag_prompt = rag_pipe.build_rag_prompt("What is antigravity?", rag_results)
assert "DOCUMENT CONTEXT" in rag_prompt
print("[OK] rag.py passed!")

print("Testing tokenizer.py and model.py...")
import tokenizer
import model
tok = tokenizer.load_tokenizer("Qwen/Qwen2.5-0.5B-Instruct")
m = model.load_model("Qwen/Qwen2.5-0.5B-Instruct")
tokens, ids = tokenizer.get_tokens(tok, "Hello world")
assert len(tokens) == 2
print("[OK] tokenizer.py & model.py loading passed!")

print("Testing xray.py...")
import xray
xray_data = xray.analyze_input_internals(m, tok, "Hello world", max_tokens=10)
assert "tokens" in xray_data
assert "embeddings_tensor" in xray_data
assert "predictions" in xray_data
assert len(xray_data["predictions"]) > 0
print(f"[OK] xray.py passed! Predictions: {[p['token'] for p in xray_data['predictions'][:3]]}")

print("Testing visualization.py...")
import visualization
fig_pca = visualization.plot_embeddings_pca(xray_data["embeddings_tensor"], xray_data["decoded_tokens"])
assert fig_pca is not None
fig_attn = visualization.plot_attention_heatmap(xray_data["attentions"][0], xray_data["decoded_tokens"], 0, 0)
assert fig_attn is not None
fig_prob = visualization.plot_token_probabilities(xray_data["predictions"])
assert fig_prob is not None
print("[OK] visualization.py passed!")

print("Testing chat.py...")
import chat
engine = chat.ChatEngine(m, tok, rag_pipe)
mem2 = memory.ConversationMemory("test_chat_engine")
mem2.add_message("user", "Hello assistant")
ctx_turn, r_sources = engine.prepare_turn(mem2, "What is machine learning?", system_prompt="Be concise.")
assert len(ctx_turn) >= 2
memory.ConversationMemory.delete("test_chat_engine")
print("[OK] chat.py passed!")

print("\n=== ALL UNIT AND INTEGRATION TESTS PASSED SUCCESSFULLY! ===")
