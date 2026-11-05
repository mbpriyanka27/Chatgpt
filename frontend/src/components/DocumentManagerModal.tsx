import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, FileTextIcon, TrashIcon, PlusIcon } from './Icons';

interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  pages_count: number;
  chunks_count: number;
  uploaded_at: string;
}

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  apiUrl: string;
  onDocumentsUpdated?: () => void;
}

export function DocumentManagerModal({
  isOpen,
  onClose,
  token,
  apiUrl,
  onDocumentsUpdated
}: DocumentManagerModalProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadDocuments();
    }
  }, [isOpen, token]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;
    const file = files[0];

    const validExtensions = ['.pdf', '.docx', '.txt', '.csv', '.json'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError(`Unsupported file type. Allowed: ${validExtensions.join(', ')}`);
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(`Extracting and indexing ${file.name}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${apiUrl}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setUploadProgress(`Indexed ${data.filename} (${data.chunks_count} chunks, ${data.pages_count} pages)`);
      await loadDocuments();
      if (onDocumentsUpdated) onDocumentsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!token || !confirm(`Delete document "${filename}" and its vector index?`)) return;

    try {
      const res = await fetch(`${apiUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (onDocumentsUpdated) onDocumentsUpdated();
      }
    } catch (err: any) {
      console.error('Delete error:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#1e1e2f] border border-[rgba(255,255,255,0.1)] p-6 shadow-2xl text-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <FileTextIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Document Library (RAG Knowledge Base)</h2>
              <p className="text-xs text-gray-400">
                Upload files to ground ChatGPT in your private documents with citations.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Drag and Drop Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 border-2 border-dashed border-[rgba(255,255,255,0.15)] hover:border-emerald-500/60 rounded-xl p-6 text-center cursor-pointer bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.json"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-2">
              <PlusIcon className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-gray-200">
              {uploading ? uploadProgress : 'Click to upload or drag & drop files here'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Supports PDF, DOCX, TXT, CSV, JSON (up to 25 MB)
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Documents Table */}
        <div className="flex-1 overflow-y-auto mt-4 scrollbar-thin">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Uploaded Documents ({documents.length})
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              No documents uploaded yet. Add a PDF or DOCX to query it!
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="uppercase font-mono text-[10px] font-bold px-2 py-1 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                      {doc.file_type}
                    </span>
                    <div className="overflow-hidden">
                      <div className="font-medium text-white truncate max-w-xs">{doc.filename}</div>
                      <div className="text-gray-400 text-[11px]">
                        {formatFileSize(doc.file_size)} • {doc.pages_count} pages • {doc.chunks_count} chunks indexed
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    title="Delete document"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
