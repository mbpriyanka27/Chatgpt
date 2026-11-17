'use client';

import React, { useState, useRef, useEffect } from 'react';

// --- TYPES ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  dateGroup: 'Today' | 'Yesterday' | 'Previous 7 Days';
  messages: Message[];
}

interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: string;
}

// --- MOCK INITIAL CHAT HISTORY ---
const INITIAL_CHATS: ChatHistoryItem[] = [
  {
    id: 'chat-1',
    title: 'React 19 Server Components',
    dateGroup: 'Today',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'How do React 19 Server Actions simplify form submissions?',
        timestamp: '10:30 AM'
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'React 19 Server Actions execute directly on the server, eliminating boilerplate API endpoints. They provide built-in progressive enhancement, automatic pending states with `useActionState`, and zero client bundle overhead.',
        timestamp: '10:31 AM'
      }
    ]
  },
  {
    id: 'chat-2',
    title: 'FastAPI Async Architecture',
    dateGroup: 'Yesterday',
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'Explain how Server-Sent Events work in high-concurrency systems.',
        timestamp: 'Yesterday'
      },
      {
        id: 'm4',
        role: 'assistant',
        content: 'Server-Sent Events (SSE) establish a persistent unidirectional HTTP connection where the server pushes real-time text chunks using chunked transfer encoding, ideal for streaming LLM tokens.',
        timestamp: 'Yesterday'
      }
    ]
  },
  {
    id: 'chat-3',
    title: 'Minimalist Monochrome Design',
    dateGroup: 'Previous 7 Days',
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'What makes black-and-white UI designs effective?',
        timestamp: '4 days ago'
      },
      {
        id: 'm6',
        role: 'assistant',
        content: 'Monochrome palettes reduce visual clutter, amplify typographic hierarchy, and focus user attention directly on conversation content.',
        timestamp: '4 days ago'
      }
    ]
  }
];

// --- 2x2 PROMPT SUGGESTIONS ---
const PROMPT_SUGGESTIONS: SuggestionCard[] = [
  {
    id: 's1',
    title: 'Explain complex concepts',
    description: 'Break down quantum computing with simple analogies',
    prompt: 'Explain quantum computing using simple real-world analogies.',
    icon: '💡'
  },
  {
    id: 's2',
    title: 'Write & debug code',
    description: 'Design a clean TypeScript API client with typed errors',
    prompt: 'Write a clean TypeScript service class with typed fetch and robust error handling.',
    icon: '💻'
  },
  {
    id: 's3',
    title: 'Brainstorm creative ideas',
    description: '5 high-impact startup concepts combining AI and workflows',
    prompt: 'Brainstorm 5 innovative startup ideas combining AI and productivity.',
    icon: '✨'
  },
  {
    id: 's4',
    title: 'Analyze & synthesize',
    description: 'Compare monolithic vs microservices tradeoffs',
    prompt: 'Compare monolithic vs microservices architecture focusing on scalability tradeoffs.',
    icon: '🧭'
  }
];

export default function ChatGPTPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [chats, setChats] = useState<ChatHistoryItem[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-collapse sidebar on narrow mobile viewports on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputVal]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setInputVal('');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectChat = (chat: ChatHistoryItem) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      handleNewChat();
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputVal('');

    // Update or create in chat history
    let currentId = activeChatId;
    if (!currentId) {
      currentId = `chat-${Date.now()}`;
      const newChat: ChatHistoryItem = {
        id: currentId,
        title: text.length > 32 ? text.slice(0, 32) + '...' : text,
        dateGroup: 'Today',
        messages: updated
      };
      setActiveChatId(currentId);
      setChats(prev => [newChat, ...prev]);
    } else {
      setChats(prev =>
        prev.map(c => (c.id === currentId ? { ...c, messages: updated } : c))
      );
    }

    // UI-Only Simulated Assistant Response (No AI integration yet)
    setTimeout(() => {
      const asstMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: `This is a clean, minimal UI preview response to your query:\n\n> "${text}"\n\nThe collapsible sidebar, responsive layout, message cards, and input controls are fully functioning in pure black-and-white.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => {
        const full = [...prev, asstMsg];
        setChats(cList =>
          cList.map(c => (c.id === currentId ? { ...c, messages: full } : c))
        );
        return full;
      });
    }, 400);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Grouped chats
  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const dateGroups: Array<'Today' | 'Yesterday' | 'Previous 7 Days'> = [
    'Today',
    'Yesterday',
    'Previous 7 Days'
  ];

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#171717] text-[#ececf1]' : 'bg-[#ffffff] text-[#111827]'
    }`}>
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ========================================================= */}
      {/* COLLAPSIBLE LEFT SIDEBAR */}
      {/* ========================================================= */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col w-[260px] border-r transition-all duration-300 ease-in-out select-none ${
          theme === 'dark'
            ? 'bg-[#171717] border-[#2f2f2f] text-gray-200'
            : 'bg-[#f9f9f9] border-[#e5e5e5] text-gray-900'
        } ${
          isSidebarOpen
            ? 'translate-x-0 lg:w-[260px] lg:opacity-100'
            : '-translate-x-full lg:-ml-[260px] lg:w-0 lg:overflow-hidden lg:opacity-0'
        }`}
      >
        {/* Sidebar Top: Logo + Toggle Collapse Icon */}
        <div className={`flex items-center justify-between p-3.5 border-b ${
          theme === 'dark' ? 'border-[#2f2f2f]' : 'border-gray-200/80'
        }`}>
          <div
            onClick={handleNewChat}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
            }`}>
              AI
            </div>
            <span className="font-semibold text-sm tracking-tight">ChatGPT</span>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-[#262626]'
                : 'text-gray-500 hover:text-black hover:bg-gray-200/70'
            }`}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        </div>

        {/* Action: + New Chat Button */}
        <div className="p-3 pb-2">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#212121] hover:bg-[#262626] border-[#2f2f2f] text-white'
                : 'bg-white hover:bg-gray-50 border-gray-200 text-black'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold leading-none">+</span>
              <span>New chat</span>
            </div>
            <kbd className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
              theme === 'dark' ? 'bg-[#171717] border-[#333] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 scrollbar-thin">
          {dateGroups.map(group => {
            const groupChats = filteredChats.filter(c => c.dateGroup === group);
            if (groupChats.length === 0) return null;

            return (
              <div key={group} className="space-y-0.5">
                <div className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {group}
                </div>

                {groupChats.map(chat => {
                  const isActive = chat.id === activeChatId;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleSelectChat(chat)}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        isActive
                          ? theme === 'dark'
                            ? 'bg-[#212121] text-white font-semibold shadow-xs'
                            : 'bg-[#ececf1] text-black font-semibold shadow-xs'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-[#212121] hover:text-white'
                            : 'text-gray-700 hover:bg-[#f3f4f6] hover:text-black'
                      }`}
                    >
                      <span className="truncate pr-4">{chat.title}</span>

                      {/* Delete action on hover */}
                      <button
                        onClick={e => handleDeleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Delete chat"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredChats.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">
              No conversations yet.
            </div>
          )}
        </div>

        {/* Sidebar Footer: User Account */}
        <div className={`p-3 border-t ${
          theme === 'dark' ? 'border-[#2f2f2f] bg-[#171717]' : 'border-gray-200 bg-[#f9f9f9]'
        }`}>
          <div className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors cursor-pointer ${
            theme === 'dark' ? 'hover:bg-[#212121]' : 'hover:bg-gray-200/60'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
            }`}>
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">Pro User</div>
              <div className="text-[10px] text-gray-400 truncate">Free Plan &bull; Minimal UI</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CHAT CANVAS */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Top Header Bar */}
        <header className={`h-14 border-b flex items-center justify-between px-4 z-20 transition-colors ${
          theme === 'dark' ? 'bg-[#171717] border-[#2f2f2f]' : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-[#262626]'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>

            {/* Model Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border ${
              theme === 'dark'
                ? 'bg-[#212121] border-[#2f2f2f] text-white hover:bg-[#262626]'
                : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
            }`}>
              <span>ChatGPT 4o</span>
              <span className="text-[10px] text-gray-400">▾</span>
            </div>
          </div>

          {/* Top Right: Theme Toggle & New Chat Shortcut */}
          <div className="flex items-center gap-2">
            {/* Minimal Black-and-White Theme Switcher */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#212121] text-white border-[#383838] hover:bg-[#262626]'
                  : 'bg-white text-black border-gray-200 hover:bg-gray-50'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <span>☀️</span>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <span>🌙</span>
                  <span>Dark</span>
                </>
              )}
            </button>

            {/* Header New Chat Button */}
            <button
              onClick={handleNewChat}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-[#262626]'
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
              title="New Chat"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4L18.5 9.5a2.828 2.828 0 0 0-4-4L4 16v4Z" />
                <line x1="13.5" y1="6.5" x2="17.5" y2="10.5" />
              </svg>
            </button>
          </div>
        </header>

        {/* Chat Feed Area */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between scrollbar-thin">
          {messages.length === 0 ? (
            /* ========================================================= */
            /* CENTERED WELCOME SCREEN & PROMPT SUGGESTION CARDS */
            /* ========================================================= */
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto px-4 w-full py-8 text-center select-none">
              {/* Centered OpenAI / ChatGPT Logo Mark */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs mb-6 ${
                theme === 'dark' ? 'bg-[#212121] text-white border border-[#333]' : 'bg-black text-white'
              }`}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.0201-1.1683a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.5815zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.6616v.0007zm-12.641 4.1354l-2.02-1.1635a.0804.0804 0 0 1-.038-.0567V6.0747a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.204 5.4597a.7948.7948 0 0 0-.3927.6813v6.7369zm1.1448-2.0782l2.6105-1.5032 2.6105 1.5032v3.0113l-2.6105 1.5032-2.6105-1.5032z"/>
                </svg>
              </div>

              {/* Centered Welcome Headline */}
              <h1 className={`text-2xl sm:text-3xl font-semibold mb-2 tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>
                What can I help with today?
              </h1>
              <p className={`text-xs sm:text-sm max-w-md mb-8 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Ask a question, write code, brainstorm ideas, or choose a prompt suggestion below.
              </p>

              {/* 2x2 Responsive Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {PROMPT_SUGGESTIONS.map(card => (
                  <button
                    key={card.id}
                    onClick={() => {
                      setInputVal(card.prompt);
                      textareaRef.current?.focus();
                    }}
                    className={`p-4 rounded-2xl border transition-all text-left shadow-2xs group cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#212121] border-[#2f2f2f] hover:border-gray-500 hover:bg-[#262626] text-white'
                        : 'bg-white border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-black'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold tracking-tight">
                        {card.title}
                      </span>
                      <span className="text-sm">{card.icon}</span>
                    </div>
                    <p className={`text-[12px] line-clamp-2 leading-relaxed ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {card.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Feed Display */
            <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
              {messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                        theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                      }`}>
                        AI
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] text-sm leading-relaxed ${
                        isUser
                          ? theme === 'dark'
                            ? 'bg-[#2f2f2f] text-white px-4 py-2.5 rounded-3xl rounded-br-sm'
                            : 'bg-[#f4f4f4] text-black px-4 py-2.5 rounded-3xl rounded-br-sm'
                          : theme === 'dark'
                            ? 'text-gray-200 px-1 py-1'
                            : 'text-gray-900 px-1 py-1'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      <span className="text-[10px] text-gray-400 mt-1 block select-none">
                        {msg.timestamp}
                      </span>
                    </div>

                    {isUser && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${
                        theme === 'dark' ? 'bg-[#333] text-white' : 'bg-gray-200 text-gray-800'
                      }`}>
                        U
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ========================================================= */}
          {/* ROUNDED MESSAGE INPUT BOX */}
          {/* ========================================================= */}
          <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1">
            <div className={`relative flex items-center rounded-3xl border px-3.5 py-2 w-full transition-all shadow-xs ${
              theme === 'dark'
                ? 'bg-[#212121] border-[#333] focus-within:border-gray-500'
                : 'bg-[#f4f4f4] border-gray-300 focus-within:border-gray-500 focus-within:bg-white'
            }`}>
              {/* Paperclip Attachment Button */}
              <button
                type="button"
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-[#2d2d2d]'
                    : 'text-gray-500 hover:text-black hover:bg-gray-200/70'
                }`}
                title="Attach file"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Textarea Input */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message ChatGPT..."
                className={`flex-1 resize-none bg-transparent text-sm focus:outline-none px-3 py-1 font-sans max-h-40 leading-relaxed ${
                  theme === 'dark' ? 'text-white placeholder-gray-400' : 'text-black placeholder-gray-400'
                }`}
              />

              {/* Action Buttons: Mic + Send Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-[#2d2d2d]'
                      : 'text-gray-500 hover:text-black hover:bg-gray-200/70'
                  }`}
                  title="Voice input"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputVal.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    inputVal.trim()
                      ? theme === 'dark'
                        ? 'bg-white text-black hover:opacity-90 shadow-xs'
                        : 'bg-black text-white hover:opacity-90 shadow-xs'
                      : 'bg-gray-300 dark:bg-[#333] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                  title="Send message"
                  aria-label="Send message"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 7-7 7 7" />
                    <path d="M12 19V5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Disclaimer Notice */}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2 font-normal select-none">
              ChatGPT can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
