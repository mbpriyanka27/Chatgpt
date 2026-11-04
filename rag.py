import os
import uuid
from typing import List, Dict, Any, Optional
from document_loader import load_and_chunk_file
from embeddings import embed_texts, embed_query
from vector_store import FAISSVectorStore
import database

class RAGPipeline:
    """
    Per-user isolated RAG pipeline for LocalGPT Pro:
    - Stores FAISS index at data/users/<uid>/faiss_index/
    - Stores raw documents at data/users/<uid>/documents/
    - Completely isolates embeddings and retrieval between users.
    """
    def __init__(self, uid: str):
        self.uid = uid
        self.index_dir = database.get_user_dir(uid, "faiss_index")
        self.docs_dir = database.get_user_dir(uid, "documents")
        
        # Load or create user vector store
        self.vector_store = FAISSVectorStore(dimension=384)
        self.load_index()

    def load_index(self):
        try:
            self.vector_store = FAISSVectorStore.load(self.index_dir, "user_faiss")
        except Exception:
            self.vector_store = FAISSVectorStore(dimension=384)

    def save_index(self):
        self.vector_store.save(self.index_dir, "user_faiss")

    def ingest_file(self, file_bytes_or_path, filename: str, chunk_size: int = 500, chunk_overlap: int = 100) -> int:
        """
        Ingests and chunks a file, creates embeddings, stores into per-user FAISS index,
        and saves raw file to data/users/<uid>/documents/.
        """
        # Save raw copy
        safe_filename = os.path.basename(filename)
        dest_path = os.path.join(self.docs_dir, safe_filename)
        if isinstance(file_bytes_or_path, (bytes, bytearray)):
            with open(dest_path, "wb") as f:
                f.write(file_bytes_or_path)
            load_target = dest_path
        else:
            load_target = file_bytes_or_path

        chunks = load_and_chunk_file(load_target, safe_filename, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        if not chunks:
            return 0

        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
        self.vector_store.add_chunks(chunks, embeddings)
        self.save_index()

        # Record in database
        doc_id = str(uuid.uuid4())
        max_page = max([c.get("page", 1) for c in chunks], default=1)
        database.add_document(self.uid, doc_id, safe_filename, pages=max_page, chunks=len(chunks))

        return len(chunks)

    def retrieve(self, query: str, top_k: int = 3, min_score: float = 0.15) -> List[Dict[str, Any]]:
        if self.vector_store.count() == 0:
            return []

        query_emb = embed_query(query)
        raw_results = self.vector_store.similarity_search(query_emb, top_k=top_k)
        filtered = [r for r in raw_results if r.get("score", 0) >= min_score]
        return filtered if filtered else raw_results[:top_k]

    def build_rag_prompt(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return query

        context_blocks = []
        for idx, chunk in enumerate(chunks, 1):
            source_tag = f"[{idx}] Source: {chunk.get('source', 'document')} (Page {chunk.get('page', 1)})"
            context_blocks.append(f"{source_tag}\n{chunk.get('text', '')}")

        context_str = "\n\n".join(context_blocks)
        
        prompt = (
            f"Use the following excerpts from the user's uploaded document(s) to answer their question.\n"
            f"Cite the source filename and page number whenever quoting or referencing facts.\n\n"
            f"--- DOCUMENT CONTEXT ---\n"
            f"{context_str}\n"
            f"------------------------\n\n"
            f"User Question: {query}\n\n"
            f"Answer:"
        )
        return prompt

    @staticmethod
    def extract_source_references(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen = set()
        sources = []
        for c in chunks:
            key = (c.get("source", "document"), c.get("page", 1))
            if key not in seen:
                seen.add(key)
                sources.append({
                    "source": key[0],
                    "page": key[1],
                    "score": round(c.get("score", 0.0), 3),
                    "snippet": c.get("text", "")[:180] + "..." if len(c.get("text", "")) > 180 else c.get("text", "")
                })
        return sources

    def delete_document(self, filename: str):
        """Removes document and rebuilds index."""
        target_path = os.path.join(self.docs_dir, filename)
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except OSError:
                pass

        # Filter remaining chunks
        remaining_chunks = [c for c in self.vector_store.chunks if c.get("source") != filename]
        self.vector_store.clear()
        if remaining_chunks:
            texts = [c["text"] for c in remaining_chunks]
            embs = embed_texts(texts)
            self.vector_store.add_chunks(remaining_chunks, embs)
        self.save_index()

    def clear(self):
        self.vector_store.clear()
        self.save_index()
