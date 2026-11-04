import os
import io
from typing import List, Dict, Any, Union
import pypdf
import docx

def extract_text_from_pdf(file_bytes_or_path: Union[bytes, io.BytesIO, str], filename: str = "document.pdf") -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from a PDF file using pypdf.
    Returns a list of dicts: [{"text": str, "page": int, "source": str}]
    """
    pages_data = []
    if isinstance(file_bytes_or_path, (bytes, bytearray)):
        stream = io.BytesIO(file_bytes_or_path)
    elif isinstance(file_bytes_or_path, io.BytesIO):
        stream = file_bytes_or_path
    else:
        stream = open(file_bytes_or_path, "rb")

    try:
        reader = pypdf.PdfReader(stream)
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            text = text.strip()
            if text:
                pages_data.append({
                    "text": text,
                    "page": idx + 1,
                    "source": filename
                })
    finally:
        if isinstance(file_bytes_or_path, str):
            stream.close()

    return pages_data

def extract_text_from_docx(file_bytes_or_path: Union[bytes, io.BytesIO, str], filename: str = "document.docx") -> List[Dict[str, Any]]:
    """
    Extracts text from a DOCX file using python-docx.
    Estimates logical pages or sections (approx 500 words per page).
    """
    if isinstance(file_bytes_or_path, (bytes, bytearray)):
        stream = io.BytesIO(file_bytes_or_path)
    elif isinstance(file_bytes_or_path, io.BytesIO):
        stream = file_bytes_or_path
    else:
        stream = file_bytes_or_path

    doc = docx.Document(stream)
    full_paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    pages_data = []
    current_page_text = []
    current_word_count = 0
    page_num = 1
    
    for para in full_paragraphs:
        words = len(para.split())
        current_page_text.append(para)
        current_word_count += words
        
        if current_word_count >= 350:
            pages_data.append({
                "text": "\n\n".join(current_page_text),
                "page": page_num,
                "source": filename
            })
            current_page_text = []
            current_word_count = 0
            page_num += 1
            
    if current_page_text:
        pages_data.append({
            "text": "\n\n".join(current_page_text),
            "page": page_num,
            "source": filename
        })
        
    return pages_data

def extract_text_from_txt(file_bytes_or_path: Union[bytes, io.BytesIO, str], filename: str = "document.txt") -> List[Dict[str, Any]]:
    """
    Extracts text from a plain TXT file.
    """
    if isinstance(file_bytes_or_path, (bytes, bytearray)):
        content = file_bytes_or_path.decode("utf-8", errors="replace")
    elif isinstance(file_bytes_or_path, io.BytesIO):
        content = file_bytes_or_path.getvalue().decode("utf-8", errors="replace")
    else:
        with open(file_bytes_or_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

    # Split into logical sections/pages of ~2000 chars
    chunk_size = 2000
    pages_data = []
    lines = content.splitlines()
    curr_text = []
    curr_len = 0
    page_num = 1
    
    for line in lines:
        curr_text.append(line)
        curr_len += len(line) + 1
        if curr_len >= chunk_size:
            pages_data.append({
                "text": "\n".join(curr_text).strip(),
                "page": page_num,
                "source": filename
            })
            curr_text = []
            curr_len = 0
            page_num += 1
            
    if curr_text and any(c.strip() for c in curr_text):
        pages_data.append({
            "text": "\n".join(curr_text).strip(),
            "page": page_num,
            "source": filename
        })
        
    return pages_data

def chunk_document(pages_data: List[Dict[str, Any]], chunk_size: int = 500, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Splits document pages into smaller overlapping chunks for RAG.
    Preserves page and source metadata for accurate source referencing.
    """
    chunks = []
    chunk_counter = 0

    for item in pages_data:
        text = item["text"]
        page = item["page"]
        source = item["source"]
        
        # If page text is within chunk size, keep as single chunk
        if len(text) <= chunk_size:
            chunk_counter += 1
            chunks.append({
                "chunk_id": chunk_counter,
                "text": text,
                "page": page,
                "source": source
            })
            continue

        # Sliding window chunking
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            # Try to break on whitespace/sentence if not at end
            if end < len(text):
                last_space = text.rfind(" ", start, end)
                if last_space > start + chunk_size // 2:
                    end = last_space
                    
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunk_counter += 1
                chunks.append({
                    "chunk_id": chunk_counter,
                    "text": chunk_text,
                    "page": page,
                    "source": source
                })
            
            start = end - chunk_overlap if end < len(text) else len(text)
            if start < 0 or start >= len(text):
                break

    return chunks

def load_and_chunk_file(file_obj, filename: str, chunk_size: int = 500, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Loads file from stream/bytes/path, detects format, and returns chunks.
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        pages = extract_text_from_pdf(file_obj, filename=filename)
    elif ext in [".docx", ".doc"]:
        pages = extract_text_from_docx(file_obj, filename=filename)
    elif ext in [".txt", ".md"]:
        pages = extract_text_from_txt(file_obj, filename=filename)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Supported types: PDF, DOCX, TXT")

    return chunk_document(pages, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

