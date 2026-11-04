import os
import streamlit as st
import database
from rag import RAGPipeline
from auth.guards import require_login

def render_documents_page():
    user = require_login()
    uid = user["uid"]
    rag_pipe = RAGPipeline(uid=uid)

    st.markdown("### 📁 **Document Manager**")
    st.caption("Manage your private documents for Retrieval-Augmented Generation (RAG). All files and vector embeddings are strictly isolated to your account.")

    # Drag-and-drop upload with progress bar
    st.markdown("##### 📤 Upload New Document")
    uploaded_files = st.file_uploader(
        "Drag and drop PDF, DOCX, TXT, or Markdown files:",
        type=["pdf", "docx", "txt", "md"],
        accept_multiple_files=True
    )

    if uploaded_files:
        for f in uploaded_files:
            # Check if not already indexed
            existing = [d["filename"] for d in database.list_documents(uid)]
            if f.name not in existing:
                progress_bar = st.progress(0, text=f"Processing {f.name}...")
                progress_bar.progress(25, text="Extracting text & page structures...")
                bytes_data = f.read()
                progress_bar.progress(50, text="Generating sentence-transformer embeddings...")
                chunks_count = rag_pipe.ingest_file(bytes_data, f.name)
                progress_bar.progress(100, text=f"Indexed {f.name} ({chunks_count} chunks) into FAISS!")
                st.success(f"Successfully processed `{f.name}` ({chunks_count} text chunks)!")
                st.rerun()

    st.markdown("---")

    # Document library table
    docs = database.list_documents(uid)
    st.markdown(f"##### 📚 Your Uploaded Documents ({len(docs)})")

    if not docs:
        st.info("You haven't uploaded any documents yet. Drag in a PDF or DOCX file above to start chatting with your private files!")
    else:
        for doc in docs:
            col_icon, col_name, col_meta, col_del = st.columns([0.08, 0.45, 0.35, 0.12])
            with col_icon:
                st.markdown("### 📄")
            with col_name:
                st.markdown(f"**{doc['filename']}**")
                st.caption(f"Uploaded: {doc['uploaded_at'][:16].replace('T', ' ')}")
            with col_meta:
                st.markdown(f"**{doc['pages']}** pages • **{doc['chunks']}** chunks")
            with col_del:
                if st.button("🗑️ Delete", key=f"del_doc_{doc['doc_id']}", help="Delete document & remove from FAISS index"):
                    database.delete_document(uid, doc["doc_id"])
                    rag_pipe.delete_document(doc["filename"])
                    st.success(f"Deleted {doc['filename']}")
                    st.rerun()

    st.markdown("---")
    if st.button("← Back to Chat Workspace"):
        st.session_state.current_page = "workspace"
        st.rerun()

