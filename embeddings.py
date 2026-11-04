import os
import numpy as np
from typing import List, Union

_embedding_model = None

def get_embedding_model(model_name: str = "all-MiniLM-L6-v2"):
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
            # Try loading with local_files_only if available to prevent network hangs
            try:
                _embedding_model = SentenceTransformer(model_name, local_files_only=True)
            except Exception:
                _embedding_model = SentenceTransformer(model_name)
        except Exception as e:
            print(f"Warning: Failed to load SentenceTransformer ({e}). Using fallback numpy embedder.")
            _embedding_model = "fallback"
    return _embedding_model

def embed_texts(texts: List[str], model_name: str = "all-MiniLM-L6-v2") -> np.ndarray:
    """
    Computes L2-normalized embeddings for a list of strings.
    Returns float32 numpy array of shape (N, D).
    """
    if not texts:
        return np.empty((0, 384), dtype=np.float32)

    model = get_embedding_model(model_name)
    if model != "fallback":
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False, normalize_embeddings=True)
        return embeddings.astype(np.float32)
    else:
        # Fallback hash-based normalized dense vector for robust zero-dependency execution
        dim = 384
        vectors = []
        for text in texts:
            np.random.seed(abs(hash(text)) % (2**32))
            v = np.random.randn(dim).astype(np.float32)
            norm = np.linalg.norm(v)
            if norm > 0:
                v = v / norm
            vectors.append(v)
        return np.array(vectors, dtype=np.float32)

def embed_query(query: str, model_name: str = "all-MiniLM-L6-v2") -> np.ndarray:
    """
    Computes L2-normalized embedding for a single query.
    Returns float32 numpy array of shape (1, D).
    """
    return embed_texts([query], model_name=model_name)
