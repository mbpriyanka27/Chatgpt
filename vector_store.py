import os
import faiss
import numpy as np
import pickle
from typing import List, Dict, Any, Tuple

class FAISSVectorStore:
    """
    In-memory and file-backed FAISS vector store for Document RAG.
    Uses IndexFlatIP on normalized vectors for exact Cosine Similarity.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        self.chunks: List[Dict[str, Any]] = []

    def add_chunks(self, chunks: List[Dict[str, Any]], embeddings: np.ndarray):
        """
        Adds text chunks and their precomputed embeddings into the FAISS index.
        """
        if len(chunks) == 0 or embeddings.shape[0] == 0:
            return

        assert len(chunks) == embeddings.shape[0], "Mismatch between chunk count and embeddings count"
        
        # Ensure float32 and contiguous
        embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
        
        # In case dimensions differ (e.g. custom model)
        if embeddings.shape[1] != self.dimension:
            self.dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(self.dimension)
            self.chunks = []

        self.index.add(embeddings)
        self.chunks.extend(chunks)

    def similarity_search(self, query_embedding: np.ndarray, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Searches FAISS index for top_k most similar chunks.
        Returns list of chunks with 'score' added.
        """
        if self.index.ntotal == 0:
            return []

        query_embedding = np.ascontiguousarray(query_embedding, dtype=np.float32)
        k = min(top_k, self.index.ntotal)
        
        scores, indices = self.index.search(query_embedding, k)
        
        results = []
        for i in range(k):
            idx = indices[0][i]
            if idx != -1 and idx < len(self.chunks):
                chunk = dict(self.chunks[idx])
                chunk["score"] = float(scores[0][i])
                results.append(chunk)

        return results

    def get_all_sources(self) -> List[str]:
        sources = set(c["source"] for c in self.chunks if "source" in c)
        return sorted(list(sources))

    def clear(self):
        self.index = faiss.IndexFlatIP(self.dimension)
        self.chunks = []

    def count(self) -> int:
        return self.index.ntotal

    def save(self, directory: str, name: str = "faiss_index"):
        os.makedirs(directory, exist_ok=True)
        index_file = os.path.join(directory, f"{name}.index")
        chunks_file = os.path.join(directory, f"{name}.pkl")
        
        faiss.write_index(self.index, index_file)
        with open(chunks_file, "wb") as f:
            pickle.dump({"chunks": self.chunks, "dim": self.dimension}, f)

    @classmethod
    def load(cls, directory: str, name: str = "faiss_index") -> "FAISSVectorStore":
        index_file = os.path.join(directory, f"{name}.index")
        chunks_file = os.path.join(directory, f"{name}.pkl")
        
        if not (os.path.exists(index_file) and os.path.exists(chunks_file)):
            raise FileNotFoundError(f"Vector store files not found in {directory}")

        index = faiss.read_index(index_file)
        with open(chunks_file, "rb") as f:
            data = pickle.load(f)

        store = cls(dimension=data.get("dim", 384))
        store.index = index
        store.chunks = data.get("chunks", [])
        return store

