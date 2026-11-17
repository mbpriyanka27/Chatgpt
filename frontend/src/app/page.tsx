'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SparklesIcon, SendIcon, StopIcon, PaperclipIcon,
  CopyIcon, RegenerateIcon, ThumbsUpIcon, ThumbsDownIcon,
  DownloadIcon, MenuIcon, CheckIcon, EditIcon, FileTextIcon,
  MicIcon, MicOffIcon, SpeakerIcon, ImageIcon, HeadphoneIcon,
  SlidersIcon, VoiceWaveIcon, PdfIcon, PlusIcon, CloseIcon,
  SunIcon, MoonIcon, GhostIcon
} from '../components/Icons';
import { Sidebar, ChatItem } from '../components/Sidebar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { AuthModal } from '../components/AuthModal';
import { DocumentManagerModal } from '../components/DocumentManagerModal';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal';
import { VoiceChatModal } from '../components/VoiceChatModal';
import { GoogleAuthModal } from '../components/GoogleAuthModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{ filename: string; page: number; snippet: string }>;
  feedback?: string;
  created_at?: string;
}

export default function ChatGPTApp() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [docCount, setDocCount] = useState(0);

  // Theme & Temporary Chat States
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);

  // Audio, Voice & Media States
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Modals & Drawers
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [expandedSources, setExpandedSources] = useState<{ [msgId: string]: boolean }>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const [attachedDoc, setAttachedDoc] = useState<{ name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatgpt_theme') as 'light' | 'dark';
      if (saved) setTheme(saved);
    }
  }, []);

  const toggleTheme = (targetTheme?: 'light' | 'dark') => {
    const next = targetTheme || (theme === 'light' ? 'dark' : 'light');
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatgpt_theme', next);
    }
  };

  // Direct file attachment handler
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    setAttachedDoc({ name: file.name, type: `${ext} DOCUMENT` });
    setUseRag(true);

    if (!token) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        loadDocCount();
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'google.user@example.com',
          display_name: 'Google User',
          photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('chatgpt_token', data.access_token);
        localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
        setToken(data.access_token);
        setUser(data.user);
        loadChats();
        loadDocCount();
      }
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  // Auto login demo user Divya Gadwal if not already signed in
  const autoLoginDivya = async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'divya@example.com', password: 'password123' })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('chatgpt_token', data.access_token);
        localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
        setToken(data.access_token);
        setUser(data.user);
        return data.access_token;
      }
    } catch (e) {
      console.warn('Auto-login attempt failed:', e);
    }
    setUser({ id: 'user-divya-uid-100', email: 'divya@example.com', display_name: 'Divya Gadwal' });
    return null;
  };

  // Initial authentication & session check with real-time validation
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem('chatgpt_token') : null;
      if (savedToken) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setToken(savedToken);
            setUser(userData);
            return;
          }
        } catch (e) {
          // Token invalid or expired
        }
      }
      
      // If not authenticated, open authentic Google Sign-In dialog
      setIsGoogleAuthOpen(true);
    };

    initAuth();
  }, []);

  // Keyboard shortcuts (Ctrl+Shift+O = new chat, Ctrl+K = search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [token]);

  // Load chats on login
  useEffect(() => {
    if (token) {
      loadChats();
      loadDocCount();
    }
  }, [token]);

  // Load messages when active chat changes
  useEffect(() => {
    if (token && activeChatId) {
      loadChatMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId, token]);

  // Auto-scroll to bottom on new message / streaming token
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputPrompt]);

  const loadChats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        if (data.length > 0 && !activeChatId) {
          setActiveChatId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading chats:', err);
    }
  };

  const loadDocCount = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocCount(data.length);
      }
    } catch (e) {}
  };

  const loadChatMessages = async (chatId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleNewChat = async () => {
    if (!token) {
      setIsGoogleAuthOpen(true);
      return;
    }
    setActiveChatId(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      console.error('Error renaming chat:', err);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleTogglePin = async (chatId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, is_pinned: data.is_pinned } : c))
        );
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    if (!text || isStreaming) return;
    if (!token) {
      setIsGoogleAuthOpen(true);
      return;
    }

    setInputPrompt('');
    const userMsgId = 'user-' + Date.now();
    const assistantMsgId = 'asst-' + Date.now();

    // Append user message immediately to state
    const newMessages: MessageItem[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: text, created_at: new Date().toISOString() },
      { id: assistantMsgId, role: 'assistant', content: '', created_at: new Date().toISOString() }
    ];
    setMessages(newMessages);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const isImgReq = text.startsWith('/image') || text.startsWith('/draw') || text.startsWith('/img') || text.startsWith('/pic');
      let currentToken = token;
      let response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          chat_id: isTemporaryChat ? undefined : activeChatId,
          prompt: text,
          use_rag: useRag || !!attachedDoc,
          attached_document: attachedDoc ? attachedDoc.name : undefined,
          model: selectedModel,
          temperature: user?.temperature || 0.7,
          is_image_request: isImgReq,
          is_temporary: isTemporaryChat,
          api_key: typeof window !== 'undefined' ? localStorage.getItem('chatgpt_api_key') || '' : ''
        }),
        signal: abortController.signal
      });

      // Self-heal session if token was rejected or user not found
      if (response.status === 401) {
        const freshToken = await autoLoginDivya();
        if (freshToken) {
          currentToken = freshToken;
          response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${freshToken}`
            },
            body: JSON.stringify({
              chat_id: isTemporaryChat ? undefined : activeChatId,
              prompt: text,
              use_rag: useRag || !!attachedDoc,
              attached_document: attachedDoc ? attachedDoc.name : undefined,
              model: selectedModel,
              temperature: user?.temperature || 0.7,
              is_image_request: isImgReq,
              is_temporary: isTemporaryChat,
              api_key: typeof window !== 'undefined' ? localStorage.getItem('chatgpt_api_key') || '' : ''
            }),
            signal: abortController.signal
          });
        }
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Streaming failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';
      let incomingSources: any[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          const lines = chunkText.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.event === 'start') {
                  if (payload.chat_id && !activeChatId && !isTemporaryChat) {
                    setActiveChatId(payload.chat_id);
                    loadChats();
                  }
                  if (payload.sources && payload.sources.length > 0) {
                    incomingSources = payload.sources;
                  }
                } else if (payload.event === 'chunk') {
                  streamedContent += payload.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: streamedContent, sources: incomingSources }
                        : m
                    )
                  );
                } else if (payload.event === 'replace') {
                  streamedContent = payload.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: streamedContent, sources: incomingSources }
                        : m
                    )
                  );
                }
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `⚠️ **Error during inference**: ${err.message}` }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      if (!isTemporaryChat) {
        loadChats();
      }
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleFeedback = async (messageId: string, feedbackType: 'like' | 'dislike') => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ feedback: feedbackType })
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, feedback: feedbackType } : m))
        );
      }
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const handleCopyMessage = (content: string, msgId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExport = (format: 'markdown' | 'pdf' | 'json') => {
    if (!activeChatId || !token) return;
    const url = `${API_BASE_URL}/api/chats/${activeChatId}/export?format=${format}`;
    window.open(url, '_blank');
  };

  const handleClearAllChats = async () => {
    if (!token) return;
    if (confirm('Clear all your chat history? This cannot be undone.')) {
      await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats([]);
      setActiveChatId(null);
      setMessages([]);
      setIsSettingsOpen(false);
    }
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech audio is not supported in this browser environment.');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMsgId(msgId);

    const cleanText = text
      .replace(/\*\*|__|\*|_|`|```[\s\S]*?```/g, '')
      .replace(/#+\s+/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;

    // Detect language of text script for correct pronunciation
    let targetLang = 'en-US';
    if (/[\u0C80-\u0CFF]/.test(cleanText)) {
      targetLang = 'kn-IN';
    } else if (/[\u0900-\u097F]/.test(cleanText)) {
      targetLang = 'hi-IN';
    } else if (/[\u0C00-\u0C7F]/.test(cleanText)) {
      targetLang = 'te-IN';
    } else if (/[\u0B80-\u0BFF]/.test(cleanText)) {
      targetLang = 'ta-IN';
    }

    const langPrefix = targetLang.slice(0, 2).toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural')) &&
             (v.lang.toLowerCase().startsWith(langPrefix) || v.lang.toLowerCase().includes(langPrefix))
    ) || voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      utterance.lang = targetLang;
    }

    // Chrome audio policy: resume if paused/suspended
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleToggleMic = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech-to-text recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListeningMic) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListeningMic(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      const savedLang = localStorage.getItem('chatgpt_voice_lang');
      recognition.lang = savedLang && savedLang !== 'auto' ? savedLang : (navigator.language || 'en-US');

      recognition.onstart = () => setIsListeningMic(true);

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputPrompt((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      };

      recognition.onerror = () => setIsListeningMic(false);
      recognition.onend = () => setIsListeningMic(false);

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListeningMic(false);
    }
  };

  const handleInsertImagePrompt = () => {
    if (!inputPrompt.startsWith('/image')) {
      setInputPrompt('/image ');
    }
    textareaRef.current?.focus();
  };

  const handleVoiceModalSend = async (voiceQuery: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            chat_id: activeChatId,
            prompt: voiceQuery,
            use_rag: useRag,
            model: selectedModel,
            temperature: user?.temperature || 0.7,
            api_key: typeof window !== 'undefined' ? localStorage.getItem('chatgpt_api_key') || '' : ''
          })
        });

        if (!response.ok) throw new Error('Inference error');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let completeText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const payload = JSON.parse(line.slice(6));
                  if (payload.event === 'chunk') {
                    completeText += payload.text;
                  }
                } catch (e) {}
              }
            }
          }
        }
        if (activeChatId) loadChatMessages(activeChatId);
        resolve(completeText || 'I processed your request.');
      } catch (err) {
        reject(err);
      }
    });
  };

  const starterPromptCards = [
    {
      title: 'Explain Quantum Computing',
      prompt: 'Explain quantum computing and superposition using simple real-world analogies.'
    },
    {
      title: 'Debug Python Async Code',
      prompt: 'Help me debug this FastAPI async event generator that streams tokens over Server-Sent Events.'
    },
    {
      title: 'Summarize Document (RAG)',
      prompt: 'Summarize the primary conclusions and citations from my uploaded document library.'
    },
    {
      title: 'Architect a Microservice',
      prompt: 'Draft an architectural design for a high-concurrency microservice with PostgreSQL and Redis.'
    }
  ];

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans antialiased transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#212121] text-[#ececf1]' : 'bg-white text-[#111827]'
    }`}>
      {/* Sidebar Navigation */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onTogglePin={handleTogglePin}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDocuments={() => setIsDocsOpen(true)}
        onLogout={() => {
          localStorage.removeItem('chatgpt_token');
          localStorage.removeItem('chatgpt_user');
          localStorage.setItem('chatgpt_logged_out', 'true');
          setToken(null);
          setUser(null);
          setChats([]);
          setMessages([]);
          setIsGoogleAuthOpen(true);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onGoogleLogin={() => setIsGoogleAuthOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        theme={theme}
        onToggleTheme={() => toggleTheme()}
      />

      {/* Main Chat Canvas */}
      <main className={`flex-1 flex flex-col h-full relative overflow-hidden transition-colors ${theme === 'dark' ? 'bg-[#212121] text-[#ececf1]' : 'bg-white text-[#111827]'}`}>
        {/* Top Header Bar */}
        <header className={`flex items-center justify-between px-6 py-3.5 border-b z-20 transition-colors ${theme === 'dark' ? 'bg-[#212121] border-[#2f2f2f]' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`lg:hidden p-1.5 rounded-lg mr-1 ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#2f2f2f]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            {/* Pill Group: Chat, + Work, and Temporary Chat */}
            <button className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              theme === 'dark' ? 'bg-[#2f2f2f] text-white hover:bg-[#383838]' : 'bg-[#ECECF1] text-[#0D0D0D] hover:bg-[#E2E2E8]'
            }`}>
              Chat
            </button>

            <button
              onClick={() => setIsDocsOpen(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 shadow-xs cursor-pointer ${
                theme === 'dark' ? 'bg-[#212121] text-gray-300 hover:bg-[#2f2f2f] border-[#383838]' : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
              }`}
              title="Ground chat with uploaded documents & workspace files"
            >
              <span className="text-gray-400 font-bold">+</span>
              <span>Work</span>
              <span className="text-[10px] text-gray-400">▾</span>
            </button>

            {/* Temporary Chat Toggle Button */}
            <button
              onClick={() => {
                const next = !isTemporaryChat;
                setIsTemporaryChat(next);
                if (next) {
                  setActiveChatId(null);
                  setMessages([]);
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isTemporaryChat
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold'
                  : theme === 'dark'
                  ? 'bg-[#212121] text-gray-400 hover:text-white border border-[#383838]'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
              }`}
              title={isTemporaryChat ? 'Temporary Chat is ON' : 'Turn on Temporary Chat (not saved)'}
            >
              <GhostIcon className={`w-3.5 h-3.5 ${isTemporaryChat ? 'text-amber-500' : 'text-gray-400'}`} />
              <span>{isTemporaryChat ? 'Temporary ON' : 'Temporary'}</span>
            </button>
          </div>

          {/* Top Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Prominent Theme Toggle Button (Light / Dark Mood) */}
            <button
              onClick={() => toggleTheme()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-xs cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] text-yellow-300 hover:bg-[#333333] border-[#3f3f3f]'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
              title={theme === 'dark' ? 'Currently in Dark Mode. Click to switch to Light Mode' : 'Currently in Light Mode. Click to switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <SunIcon className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <MoonIcon className="w-3.5 h-3.5 text-gray-600" />
                  <span>Light</span>
                </>
              )}
            </button>

            {/* Sliders / Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#2f2f2f]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title="Settings & Model Selection"
            >
              <SlidersIcon className="w-4 h-4" />
            </button>

            {/* New Chat Top Right Shortcut */}
            <button
              onClick={handleNewChat}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#2f2f2f]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title="New Chat"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Temporary Chat Notice Banner */}
        {isTemporaryChat && (
          <div className={`px-6 py-2 flex items-center justify-between text-xs border-b font-sans transition-colors ${
            theme === 'dark' ? 'bg-amber-950/30 border-amber-900/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              <GhostIcon className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span>
                <strong>Temporary Chat</strong>: This conversation won't appear in your history, use memories, or be saved once you close it.
              </span>
            </div>
            <button
              onClick={() => setIsTemporaryChat(false)}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Turn off
            </button>
          </div>
        )}

        {/* Message Feed / Workspace */}
        <div className={`flex-1 overflow-y-auto px-6 py-4 scrollbar-thin transition-colors ${theme === 'dark' ? 'bg-[#212121]' : 'bg-white'}`}>
          <div className="max-w-3xl mx-auto space-y-6 pt-2">
            {messages.length === 0 ? (
              /* Clean Active ChatGPT Home View */
              <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 my-auto">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md mb-4 ${theme === 'dark' ? 'bg-[#2f2f2f] text-white' : 'bg-black text-white'}`}>
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className={`text-2xl font-bold mb-2 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
                  What can I help with today?
                </h1>
                <p className={`text-sm max-w-md mb-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ask anything, ground answers with your data, create AI images, or start hands-free voice chat.
                </p>

                {/* 4 Interactive Feature Starter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                  <button
                    onClick={() => handleSendMessage('/image A beautiful cinematic cyberpunk Bangalore skyline with rain and neon lights')}
                    className={`p-3.5 rounded-2xl border transition-all text-left shadow-2xs group cursor-pointer ${
                      theme === 'dark' ? 'bg-[#262626] border-[#333333] hover:bg-[#2f2f2f] text-white' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-semibold group-hover:text-emerald-500 flex items-center gap-1.5 mb-1">
                      <span>🎨</span>
                      <span>Generate an AI image</span>
                    </div>
                    <div className="text-[12px] text-gray-400 line-clamp-1">
                      Cyberpunk Bangalore skyline in neon rain
                    </div>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3.5 rounded-2xl border transition-all text-left shadow-2xs group cursor-pointer ${
                      theme === 'dark' ? 'bg-[#262626] border-[#333333] hover:bg-[#2f2f2f] text-white' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-semibold group-hover:text-teal-500 flex items-center gap-1.5 mb-1">
                      <span>📄</span>
                      <span>Attach & Analyze Document</span>
                    </div>
                    <div className="text-[12px] text-gray-400 line-clamp-1">
                      Upload PDF, DOCX, or CSV data for RAG answers
                    </div>
                  </button>

                  <button
                    onClick={() => handleSendMessage('Brainstorm 5 innovative startup ideas combining Agentic AI and healthcare in India')}
                    className={`p-3.5 rounded-2xl border transition-all text-left shadow-2xs group cursor-pointer ${
                      theme === 'dark' ? 'bg-[#262626] border-[#333333] hover:bg-[#2f2f2f] text-white' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-semibold group-hover:text-indigo-400 flex items-center gap-1.5 mb-1">
                      <span>💡</span>
                      <span>Brainstorm ideas</span>
                    </div>
                    <div className="text-[12px] text-gray-400 line-clamp-1">
                      Agentic AI startup ideas in healthcare
                    </div>
                  </button>

                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    className={`p-3.5 rounded-2xl border transition-all text-left shadow-2xs group cursor-pointer ${
                      theme === 'dark' ? 'bg-[#262626] border-[#333333] hover:bg-[#2f2f2f] text-white' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-semibold group-hover:text-emerald-500 flex items-center gap-1.5 mb-1">
                      <span>🎙️</span>
                      <span>Interactive Voice Chat</span>
                    </div>
                    <div className="text-[12px] text-gray-400 line-clamp-1">
                      Hands-free fluid orb in Kannada or English
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user';

                return (
                  <div key={msg.id || idx} className="group text-sm leading-relaxed">
                    {isUser ? (
                      <div className="flex justify-end mb-4">
                        <div className={`rounded-3xl px-5 py-3 max-w-[85%] text-[15px] font-normal leading-relaxed whitespace-pre-wrap ${
                          theme === 'dark' ? 'bg-[#2f2f2f] text-[#ececf1]' : 'bg-[#f4f4f4] text-[#111827]'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Markdown rendered assistant message */}
                        <div className={`leading-relaxed text-[15px] ${theme === 'dark' ? 'text-[#ececf1]' : 'text-[#1F2937]'}`}>
                          <MarkdownRenderer content={msg.content} />
                          {isStreaming && msg === messages[messages.length - 1] && (
                            <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-middle" />
                          )}
                        </div>

                        {/* RAG Source Citation Chips if present */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className={`mt-3 pt-2 border-t ${theme === 'dark' ? 'border-[#2f2f2f]' : 'border-gray-100'}`}>
                            <div className="text-[11px] font-semibold text-teal-500 mb-1.5 flex items-center gap-1.5">
                              <FileTextIcon className="w-3.5 h-3.5" />
                              <span>Sources Grounding ({msg.sources.length}):</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() =>
                                    setExpandedSources((prev) => ({
                                      ...prev,
                                      [`${msg.id}-${sIdx}`]: !prev[`${msg.id}-${sIdx}`]
                                    }))
                                  }
                                  className={`cursor-pointer px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                                    theme === 'dark' ? 'bg-teal-950/40 border-teal-800 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-800'
                                  }`}
                                >
                                  <div className="font-mono text-[11px]">
                                    📄 {src.filename} • p.{src.page}
                                  </div>
                                  {expandedSources[`${msg.id}-${sIdx}`] && (
                                    <div className="mt-1.5 pt-1.5 border-t border-teal-200/50 text-[11px] text-gray-300 italic">
                                      "{src.snippet}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Bar Underneath Assistant Message */}
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <button
                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors shadow-xs ${
                              theme === 'dark' ? 'bg-[#262626] hover:bg-[#2f2f2f] border-[#383838] text-gray-300' : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                            }`}
                            title="Copy message"
                          >
                            {copiedMsgId === msg.id ? (
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <CopyIcon className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleSpeak(msg.id, msg.content)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors shadow-xs ${
                              speakingMsgId === msg.id
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 animate-pulse'
                                : theme === 'dark'
                                ? 'bg-[#262626] hover:bg-[#2f2f2f] border-[#383838] text-gray-300'
                                : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                            }`}
                            title="Read aloud"
                          >
                            {speakingMsgId === msg.id ? (
                              <StopIcon className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <SpeakerIcon className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span>{speakingMsgId === msg.id ? 'Stop' : 'Listen'}</span>
                          </button>

                          <button
                            onClick={() => setIsDocsOpen(true)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors shadow-xs ${
                              theme === 'dark' ? 'bg-[#262626] hover:bg-[#2f2f2f] border-[#383838] text-gray-300' : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                            }`}
                            title="Inspect Document Grounding and RAG X-Ray"
                          >
                            <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>X-Ray RAG</span>
                          </button>

                          <button
                            onClick={() => {
                              const prevPrompt = messages[idx - 1]?.content || 'Continue';
                              handleSendMessage(prevPrompt);
                            }}
                            className={`p-1.5 rounded-full border transition-colors shadow-xs ${
                              theme === 'dark' ? 'bg-[#262626] hover:bg-[#2f2f2f] border-[#383838] text-gray-400 hover:text-white' : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900'
                            }`}
                            title="Regenerate response"
                          >
                            <RegenerateIcon className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Hidden File Input for Direct Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleDirectFileUpload}
          className="hidden"
          accept=".pdf,.docx,.txt,.csv,.json,.md"
        />

        {/* Floating Stop Generating Control */}
        {isStreaming && (
          <div className="absolute bottom-28 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <button
              onClick={handleStopGenerating}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 shadow-lg transition-all hover:scale-105"
            >
              <StopIcon className="w-3.5 h-3.5 text-red-500" />
              <span>Stop generating</span>
            </button>
          </div>
        )}

        {/* Bottom Floating Attached Document & Floating Input Area */}
        <div className={`w-full px-4 pb-4 pt-1 transition-colors ${theme === 'dark' ? 'bg-[#212121]' : 'bg-white'}`}>
          <div className="max-w-3xl mx-auto">
            {/* Attached document chip above the input bar */}
            {attachedDoc && (
              <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-xs max-w-sm mb-2.5 transition-all ${
                theme === 'dark' ? 'bg-[#2a2a2a] border border-[#383838] text-white' : 'bg-white border border-gray-200/90 text-gray-800'
              }`}>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
                  <PdfIcon className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <div className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {attachedDoc.name}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                    {attachedDoc.type || 'DOCUMENT'}
                  </div>
                </div>
                <button
                  onClick={() => setAttachedDoc(null)}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#383838]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Remove document"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Floating Capsule Input Bar */}
            <div className={`relative flex items-center rounded-full border px-3.5 py-1.5 w-full transition-all ${
              theme === 'dark'
                ? 'bg-[#2f2f2f] border-[#3f3f3f] shadow-[0_2px_14px_rgba(0,0,0,0.3)] focus-within:border-gray-500'
                : 'bg-white border-gray-200 shadow-[0_2px_14px_rgba(0,0,0,0.06)] focus-within:border-gray-300'
            }`}>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach file or document (PDF, DOCX, TXT, CSV)"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#3a3a3a]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <PlusIcon className="w-5 h-5" />
              </button>

              <button
                onClick={handleInsertImagePrompt}
                title="Generate HD AI Image (/image ...)"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer text-sm ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#3a3a3a]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🎨
              </button>

              <input
                ref={textareaRef as any}
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isTemporaryChat ? "Ask anything in temporary chat..." : "Ask anything"}
                className={`flex-1 bg-transparent text-[14px] focus:outline-none px-3 py-1 font-sans ${
                  theme === 'dark' ? 'text-white placeholder-gray-400' : 'text-gray-800 placeholder-gray-400'
                }`}
              />

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  title="ChatGPT Voice Mode (Interactive Fluid Circle)"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#3a3a3a]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <MicIcon className="w-4 h-4" />
                </button>

                {/* Signature Green Voice Wave Button */}
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  title="ChatGPT Voice Mode (Interactive Fluid Circle)"
                  className="w-9 h-9 rounded-full bg-[#10A37F] hover:bg-[#0D8A6C] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <VoiceWaveIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Two-Way ChatGPT Voice Mode Modal */}
      <VoiceChatModal
        isOpen={isVoiceModalOpen}
        onClose={() => {
          setIsVoiceModalOpen(false);
          if (activeChatId) loadChatMessages(activeChatId);
          loadChats();
        }}
        apiUrl={API_BASE_URL}
        token={token}
        chatId={activeChatId}
        selectedModel={selectedModel}
        onBackgroundMessage={(userText, asstText, isFinished, newChatId) => {
          if (newChatId && !activeChatId) {
            setActiveChatId(newChatId);
          }
          if (isFinished) {
            setMessages((prev) => [
              ...prev.filter((m) => !m.id.startsWith('voice-live-')),
              { id: 'user-v-' + Date.now(), role: 'user', content: userText, created_at: new Date().toISOString() },
              { id: 'asst-v-' + Date.now(), role: 'assistant', content: asstText, created_at: new Date().toISOString() }
            ]);
            loadChats();
            if (newChatId || activeChatId) {
              loadChatMessages(newChatId || activeChatId!);
            }
          } else {
            setMessages((prev) => {
              const filtered = prev.filter((m) => !m.id.startsWith('voice-live-'));
              return [
                ...filtered,
                { id: 'voice-live-u', role: 'user', content: userText },
                { id: 'voice-live-a', role: 'assistant', content: asstText }
              ];
            });
          }
        }}
      />

      {/* Google Sign-In Modal */}
      <GoogleAuthModal
        isOpen={isGoogleAuthOpen}
        onClose={() => setIsGoogleAuthOpen(false)}
        onSuccess={(tok, usr) => {
          localStorage.removeItem('chatgpt_logged_out');
          setToken(tok);
          setUser(usr);
          loadChats();
          loadDocCount();
        }}
        apiUrl={API_BASE_URL}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenGoogleAuth={() => setIsGoogleAuthOpen(true)}
        onLoginSuccess={(tok, usr) => {
          localStorage.removeItem('chatgpt_logged_out');
          setToken(tok);
          setUser(usr);
          loadChats();
        }}
        apiUrl={API_BASE_URL}
      />

      <DocumentManagerModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        token={token}
        apiUrl={API_BASE_URL}
        onDocumentsUpdated={loadDocCount}
      />

      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        token={token}
        apiUrl={API_BASE_URL}
        currentTheme={theme}
        onThemeChange={(newTheme) => toggleTheme(newTheme)}
        onUserUpdated={(u) => {
          setUser(u);
          if (u.theme) {
            toggleTheme(u.theme);
          }
        }}
        onClearAllChats={handleClearAllChats}
        onAccountDeleted={() => {
          localStorage.clear();
          setToken(null);
          setUser(null);
          setChats([]);
          setMessages([]);
          setIsSettingsOpen(false);
          setIsAuthOpen(true);
        }}
      />
    </div>
  );
}
