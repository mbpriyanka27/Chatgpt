'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SparklesIcon, SendIcon, StopIcon, PaperclipIcon,
  CopyIcon, RegenerateIcon, ThumbsUpIcon, ThumbsDownIcon,
  DownloadIcon, MenuIcon, CheckIcon, EditIcon, FileTextIcon,
  MicIcon, MicOffIcon, SpeakerIcon, ImageIcon, HeadphoneIcon
} from '../components/Icons';
import { Sidebar, ChatItem } from '../components/Sidebar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { AuthModal } from '../components/AuthModal';
import { DocumentManagerModal } from '../components/DocumentManagerModal';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal';
import { VoiceChatModal } from '../components/VoiceChatModal';

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

  // Audio, Voice & Media States
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Modals & Drawers
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [expandedSources, setExpandedSources] = useState<{ [msgId: string]: boolean }>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial authentication & session check
  useEffect(() => {
    const savedToken = localStorage.getItem('chatgpt_token');
    const savedUser = localStorage.getItem('chatgpt_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Fallback
      }
    } else {
      // Auto-open auth modal if not signed in
      setIsAuthOpen(true);
    }
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
      setIsAuthOpen(true);
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
      setIsAuthOpen(true);
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
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chat_id: activeChatId,
          prompt: text,
          use_rag: useRag,
          model: selectedModel,
          temperature: user?.temperature || 0.7,
          api_key: typeof window !== 'undefined' ? localStorage.getItem('chatgpt_api_key') || '' : ''
        }),
        signal: abortController.signal
      });

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
                  if (payload.chat_id && !activeChatId) {
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
      loadChats();
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

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny')) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
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
      recognition.lang = 'en-US';

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
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e0e17] text-white font-sans antialiased">
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
          setToken(null);
          setUser(null);
          setChats([]);
          setMessages([]);
          setIsAuthOpen(true);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Canvas */}
      <main className="flex-1 flex flex-col h-full bg-[#181824] relative overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.08)] bg-[#181824]/90 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)]"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            {/* Model Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[#242436] hover:bg-[#2c2c42] border border-[rgba(255,255,255,0.1)] text-white text-xs font-semibold rounded-xl px-3 py-1.5 appearance-none pr-7 cursor-pointer transition-colors focus:outline-none focus:border-emerald-500"
              >
                <option value="llama-3.3-70b-versatile">⚡ LLaMA 3.3 70B (Hosted)</option>
                <option value="gpt-4o-mini">🧠 GPT-4o-mini (Hosted)</option>
                <option value="qwen/qwen-2.5-72b-instruct">🚀 Qwen 2.5 72B (Hosted)</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                ▼
              </div>
            </div>

            {/* Document Grounding Indicator */}
            {docCount > 0 && (
              <button
                onClick={() => setUseRag(!useRag)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                  useRag
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white'
                }`}
              >
                <FileTextIcon className="w-3.5 h-3.5" />
                <span>RAG Grounding: {useRag ? 'Active' : 'Off'}</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-mono">
                  {docCount} docs
                </span>
              </button>
            )}
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2">
            {/* ChatGPT Voice Mode Button */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-900/30 transition-all hover:scale-105"
              title="Start hands-free two-way Voice Chat"
            >
              <HeadphoneIcon className="w-3.5 h-3.5" />
              <span>Voice Mode</span>
            </button>

            {/* Auto-Speak Toggle */}
            <button
              onClick={() => {
                const next = !autoSpeakEnabled;
                setAutoSpeakEnabled(next);
                if (!next && typeof window !== 'undefined') {
                  window.speechSynthesis?.cancel();
                  setSpeakingMsgId(null);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                autoSpeakEnabled
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white'
              }`}
              title={autoSpeakEnabled ? 'Auto-Speak is ON: AI answers will be read aloud' : 'Enable Auto-Speak voice audio'}
            >
              <SpeakerIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audio: {autoSpeakEnabled ? 'On' : 'Off'}</span>
            </button>

            {activeChatId && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExport('markdown')}
                  title="Export conversation as Markdown"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-gray-300 hover:text-white transition-colors"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Export .MD</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  title="Export conversation as PDF"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-gray-300 hover:text-white transition-colors"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Export PDF</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Message Feed / Workspace */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-900/40 mb-4">
                  <SparklesIcon className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
                  {user?.display_name || 'Friend'}
                </h1>
                <p className="text-sm text-gray-400 max-w-md mb-8">
                  What can I help you discover, build, or analyze today? Ask a question or ground answers with your uploaded files.
                </p>

                {/* 4 Starter Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {starterPromptCards.map((card, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="p-4 rounded-2xl bg-[#202030] hover:bg-[#28283c] border border-[rgba(255,255,255,0.06)] hover:border-emerald-500/30 text-left transition-all shadow-sm group"
                    >
                      <div className="text-sm font-semibold text-white group-hover:text-emerald-300 mb-1">
                        {card.title}
                      </div>
                      <div className="text-xs text-gray-400 line-clamp-2">
                        {card.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div key={msg.id} className="group relative flex gap-4 text-sm leading-relaxed">
                  {/* Avatar */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isUser ? (
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {user?.display_name ? user.display_name.charAt(0) : 'U'}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
                        <SparklesIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 overflow-hidden space-y-2">
                    <div className="font-semibold text-xs text-gray-400 flex items-center gap-2">
                      <span>{isUser ? user?.display_name || 'You' : 'ChatGPT'}</span>
                      {msg.created_at && (
                        <span className="text-[10px] text-gray-500 font-normal">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="text-[#ececf1] leading-relaxed">
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <>
                          <MarkdownRenderer content={msg.content} />
                          {isStreaming && msg === messages[messages.length - 1] && (
                            <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
                          )}
                        </>
                      )}
                    </div>

                    {/* RAG Source Citation Chips */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="text-[11px] font-semibold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                          <FileTextIcon className="w-3.5 h-3.5" />
                          <span>Sources Grounding ({msg.sources.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, idx) => (
                            <div
                              key={idx}
                              onClick={() =>
                                setExpandedSources((prev) => ({
                                  ...prev,
                                  [`${msg.id}-${idx}`]: !prev[`${msg.id}-${idx}`]
                                }))
                              }
                              className="cursor-pointer px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/40 text-xs text-cyan-300 transition-colors"
                            >
                              <div className="font-mono text-[11px]">
                                📄 {src.filename} • p.{src.page}
                              </div>
                              {expandedSources[`${msg.id}-${idx}`] && (
                                <div className="mt-1.5 pt-1.5 border-t border-cyan-800/40 text-[11px] text-gray-300 italic">
                                  "{src.snippet}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400">
                      <button
                        onClick={() => handleCopyMessage(msg.content, msg.id)}
                        className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? (
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <CopyIcon className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isUser && (
                        <>
                          {/* Audio Voice Response / Read Aloud */}
                          <button
                            onClick={() => handleToggleSpeak(msg.id, msg.content)}
                            className={`p-1 rounded hover:bg-[rgba(255,255,255,0.08)] transition-colors ${
                              speakingMsgId === msg.id
                                ? 'text-cyan-400 bg-cyan-950/40 animate-pulse'
                                : 'hover:text-white'
                            }`}
                            title={speakingMsgId === msg.id ? 'Stop audio playback' : 'Read aloud (Audio response)'}
                          >
                            {speakingMsgId === msg.id ? (
                              <StopIcon className="w-3.5 h-3.5" />
                            ) : (
                              <SpeakerIcon className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              // Find preceding user prompt
                              const msgIndex = messages.indexOf(msg);
                              const prevPrompt = messages[msgIndex - 1]?.content;
                              if (prevPrompt) handleSendMessage(prevPrompt);
                            }}
                            className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
                            title="Regenerate response"
                          >
                            <RegenerateIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'like')}
                            className={`p-1 rounded hover:bg-[rgba(255,255,255,0.08)] ${
                              msg.feedback === 'like' ? 'text-emerald-400' : 'hover:text-white'
                            }`}
                            title="Good response"
                          >
                            <ThumbsUpIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'dislike')}
                            className={`p-1 rounded hover:bg-[rgba(255,255,255,0.08)] ${
                              msg.feedback === 'dislike' ? 'text-red-400' : 'hover:text-white'
                            }`}
                            title="Bad response"
                          >
                            <ThumbsDownIcon className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {isUser && (
                        <button
                          onClick={() => {
                            setInputPrompt(msg.content);
                            textareaRef.current?.focus();
                          }}
                          className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
                          title="Edit message"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Stop Generating Control */}
        {isStreaming && (
          <div className="absolute bottom-28 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <button
              onClick={handleStopGenerating}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-[#232336] hover:bg-[#2c2c44] border border-[rgba(255,255,255,0.15)] text-xs font-semibold text-white shadow-xl transition-all hover:scale-105"
            >
              <StopIcon className="w-3.5 h-3.5 text-red-400" />
              <span>Stop generating</span>
            </button>
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="p-4 bg-[#181824]/95 border-t border-[rgba(255,255,255,0.08)]">
          <div className="max-w-3xl mx-auto">
            {/* Input Wrapper */}
            <div className="relative rounded-2xl bg-[#202030] border border-[rgba(255,255,255,0.1)] focus-within:border-emerald-500/60 shadow-xl transition-colors">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask anything or request document analysis..."
                className="w-full bg-transparent px-4 pt-3.5 pb-10 text-sm text-white placeholder-gray-400 focus:outline-none resize-none font-sans"
              />

              {/* Bottom Control Icons */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDocsOpen(true)}
                    title="Upload or manage documents (PDF, DOCX, TXT, CSV, JSON)"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors flex items-center gap-1.5 text-xs"
                  >
                    <PaperclipIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Attach file</span>
                  </button>

                  {/* AI Image Generation Trigger Button */}
                  <button
                    onClick={handleInsertImagePrompt}
                    title="Generate an AI Image (/image ...)"
                    className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 transition-colors flex items-center gap-1.5 text-xs font-medium"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Image</span>
                  </button>

                  <label className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useRag}
                      onChange={(e) => setUseRag(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span className="text-[11px]">Search my documents</span>
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Voice Mode Big Circle Trigger */}
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    title="Open ChatGPT Voice Mode (Interactive Fluid Circle)"
                    className="p-2 rounded-xl transition-all shadow-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white hover:scale-105"
                  >
                    <HeadphoneIcon className="w-4 h-4" />
                  </button>

                  {/* Microphone Voice Dictation Button */}
                  <button
                    onClick={handleToggleMic}
                    title={isListeningMic ? 'Stop voice listening' : 'Voice Input (Speak your prompt)'}
                    className={`p-2 rounded-xl transition-all shadow-md ${
                      isListeningMic
                        ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 scale-105'
                        : 'bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-gray-300 hover:text-white'
                    }`}
                  >
                    {isListeningMic ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
                  </button>

                  {/* Send / Stop Action */}
                  <button
                    onClick={() => (isStreaming ? handleStopGenerating() : handleSendMessage())}
                    disabled={!inputPrompt.trim() && !isStreaming}
                    className={`p-2 rounded-xl transition-all shadow-md ${
                      isStreaming
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : inputPrompt.trim()
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105'
                        : 'bg-[rgba(255,255,255,0.05)] text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isStreaming ? <StopIcon className="w-4 h-4" /> : <SendIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-gray-500 mt-2">
              ChatGPT Pro with AI Image Generation & Real-Time Voice Audio. Powered by Hosted LLMs.
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
        onBackgroundMessage={(userText, asstText, isFinished) => {
          setMessages((prev) => {
            const filtered = prev.filter((m) => !m.id.startsWith('voice-live-'));
            return [
              ...filtered,
              { id: 'voice-live-u', role: 'user', content: userText },
              { id: 'voice-live-a', role: 'assistant', content: asstText }
            ];
          });
          if (isFinished) {
            loadChats();
            if (activeChatId) loadChatMessages(activeChatId);
          }
        }}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(tok, usr) => {
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
        onUserUpdated={(u) => setUser(u)}
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
