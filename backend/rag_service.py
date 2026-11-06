import os
import json
import math
import re
from typing import List, Dict, Any, Tuple
from pathlib import Path
import pypdf
import docx

DATA_DIR = Path("data/users")


def sanitize_filename(filename: str) -> str:
    """Removes unsafe characters from filename."""
    return re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)


def extract_text_from_file(file_path: Path, ext: str) -> List[Dict[str, Any]]:
    """
    Extracts text and page numbers from PDF, DOCX, TXT, CSV, JSON.
    Returns list of dicts: [{"text": str, "page": int}]
    """
    pages_data = []
    
    if ext == ".pdf":
        reader = pypdf.PdfReader(str(file_path))
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_data.append({"text": text, "page": idx + 1})
    elif ext == ".docx":
        doc = docx.Document(str(file_path))
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        pages_data.append({"text": full_text, "page": 1})
    elif ext in [".txt", ".csv", ".json"]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            pages_data.append({"text": content, "page": 1})
            
    return pages_data


def chunk_pages(pages_data: List[Dict[str, Any]], filename: str, chunk_size: int = 400, overlap: int = 50) -> List[Dict[str, Any]]:
    """Splits extracted page text into overlapping semantic chunks with page metadata."""
    chunks = []
    chunk_counter = 0

    for item in pages_data:
        words = item["text"].split()
        if not words:
            continue
            
        step = max(1, chunk_size - overlap)
        for i in range(0, len(words), step):
            chunk_words = words[i : i + chunk_size]
            chunk_text = " ".join(chunk_words)
            chunk_counter += 1
            chunks.append({
                "id": f"{filename}-chunk-{chunk_counter}",
                "filename": filename,
                "page": item["page"],
                "text": chunk_text
            })
            
    return chunks


class UserVectorStore:
    """Per-user document vector store with semantic retrieval."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.user_dir = DATA_DIR / user_id
        self.docs_dir = self.user_dir / "documents"
        self.index_file = self.user_dir / "chunks_index.json"
        
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        self.chunks: List[Dict[str, Any]] = []
        self._load_index()

    def _load_index(self):
        if self.index_file.exists():
            try:
                with open(self.index_file, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
            except Exception:
                self.chunks = []
        else:
            self.chunks = []

    def _save_index(self):
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, indent=2)

    def add_document(self, filename: str, file_bytes: bytes) -> Dict[str, Any]:
        """Saves file, extracts text, indexes chunks, and returns document stats."""
        clean_name = sanitize_filename(filename)
        dest_path = self.docs_dir / clean_name
        
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
            
        ext = dest_path.suffix.lower()
        pages_data = extract_text_from_file(dest_path, ext)
        new_chunks = chunk_pages(pages_data, clean_name)
        
        # Remove any previous chunks for this filename
        self.chunks = [c for c in self.chunks if c["filename"] != clean_name]
        self.chunks.extend(new_chunks)
        self._save_index()
        
        return {
            "filename": clean_name,
            "pages_count": len(pages_data) if pages_data else 1,
            "chunks_count": len(new_chunks),
            "file_size": len(file_bytes),
            "file_type": ext.lstrip(".")
        }

    def delete_document(self, filename: str):
        """Removes document and its chunks."""
        clean_name = sanitize_filename(filename)
        dest_path = self.docs_dir / clean_name
        if dest_path.exists():
            try:
                dest_path.unlink()
            except Exception:
                pass
                
        self.chunks = [c for c in self.chunks if c["filename"] != clean_name]
        self._save_index()

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """Performs lexical and semantic scoring against indexed document chunks."""
        if not self.chunks:
            return []

        query_terms = re.findall(r'\w+', query.lower())
        if not query_terms:
            return []

        scored_chunks = []
        for chunk in self.chunks:
            chunk_terms = re.findall(r'\w+', chunk["text"].lower())
            chunk_len = len(chunk_terms) or 1
            
            # Term Frequency overlap
            score = 0.0
            for term in query_terms:
                tf = chunk_terms.count(term)
                if tf > 0:
                    score += (tf / chunk_len) * (math.log(1 + 10.0 / tf))
                    
            if score > 0:
                scored_chunks.append((score, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_matches = [item[1] for item in scored_chunks[:top_k]]
        return top_matches

