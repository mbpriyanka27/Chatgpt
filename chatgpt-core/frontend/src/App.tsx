import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatHeader } from './components/chat/ChatHeader';
import { WelcomeScreen } from './components/chat/WelcomeScreen';
import { MessageList } from './components/chat/MessageList';
import { ChatInput } from './components/chat/ChatInput';
import { Conversation, Message } from './types/chat';

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'React 19 Server Components Design',
    dateGroup: 'Today',
    updatedAt: '10:30 AM',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'How do React 19 Server Actions simplify form submissions without external state libraries?',
        timestamp: '10:28 AM'
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'React 19 introduces native Server Actions alongside hooks like `useActionState` and `useFormStatus`.\n\nKey advantages:\n- **Zero Client Bundle**: The action runs directly on the server, eliminating the need to ship heavy client-side API clients.\n- **Progressive Enhancement**: Forms work even before client JavaScript hydrates.\n- **Built-in Pending State**: `isPending` automatically tracks submission progress without manual boolean flags.',
        timestamp: '10:30 AM'
      }
    ]
  },
  {
    id: 'conv-2',
    title: 'FastAPI High-Concurrency Microservices',
    dateGroup: 'Yesterday',
    updatedAt: 'Yesterday',
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'What is the most efficient way to stream Server-Sent Events in FastAPI?',
        timestamp: 'Yesterday'
      },
      {
        id: 'm4',
        role: 'assistant',
        content: 'In FastAPI, use `StreamingResponse` with an async generator:\n\n```python\nfrom fastapi.responses import StreamingResponse\n\nasync def event_generator():\n    for token in tokens:\n        yield f"data: {token}\\n\\n"\n\nreturn StreamingResponse(event_generator(), media_type="text/event-stream")\n```\n\nThis keeps memory constant and delivers tokens with near-zero latency.',
        timestamp: 'Yesterday'
      }
    ]
  },
  {
    id: 'conv-3',
    title: 'Monochrome Minimalist UI System',
    dateGroup: 'Previous 7 Days',
    updatedAt: '3 days ago',
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'Explain the psychology behind minimal black and white user interfaces.',
        timestamp: '3 days ago'
      },
      {
        id: 'm6',
        role: 'assistant',
        content: 'Monochrome design removes cognitive noise. By eliminating distracting saturated palettes, user focus shifts entirely to typography, content hierarchy, and information density.',
        timestamp: '3 days ago'
      }
    ]
  }
];

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');

  // Auto close sidebar on narrow mobile screens on load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setInputPrompt('');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    const found = conversations.find(c => c.id === id);
    if (found) {
      setActiveId(found.id);
      setMessages(found.messages);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      handleNewChat();
    }
  };

  const handleSendMessage = (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');

    // Update or create active conversation
    let currentId = activeId;
    if (!currentId) {
      currentId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: currentId,
        title: textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : ''),
        dateGroup: 'Today',
        messages: newMessages,
        updatedAt: 'Just now'
      };
      setActiveId(currentId);
      setConversations(prev => [newConv, ...prev]);
    } else {
      setConversations(prev =>
        prev.map(c =>
          c.id === currentId
            ? { ...c, messages: newMessages, updatedAt: 'Just now' }
            : c
        )
      );
    }

    // Mock UI Assistant Response (Focus only on UI; no AI integration yet)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: `**Preview Response**:\n\nYou asked: "${textToSend}"\n\nThis is a clean, minimal UI placeholder. The conversational frontend layout, collapsible sidebar, and message styling are fully configured and ready for live AI streaming integration.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        // update conversation record
        setConversations(cList =>
          cList.map(c =>
            c.id === currentId ? { ...c, messages: updated } : c
          )
        );
        return updated;
      });
    }, 450);
  };

  const activeTitle = activeId
    ? conversations.find(c => c.id === activeId)?.title || 'ChatGPT'
    : 'ChatGPT';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-black font-sans antialiased">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Chat Canvas Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        {/* Top Header Bar */}
        <ChatHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewChat}
          title={activeTitle}
        />

        {/* Dynamic Center Area: Welcome Screen or Message List */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between">
          {messages.length === 0 ? (
            <WelcomeScreen onSelectPrompt={(prompt) => handleSendMessage(prompt)} />
          ) : (
            <MessageList messages={messages} />
          )}

          {/* Rounded Message Input Box */}
          <ChatInput
            value={inputPrompt}
            onChange={setInputPrompt}
            onSubmit={() => handleSendMessage()}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
