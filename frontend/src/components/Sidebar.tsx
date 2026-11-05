import React, { useState } from 'react';
import {
  SparklesIcon, PlusIcon, SearchIcon, PinIcon,
  EditIcon, TrashIcon, SettingsIcon, FileTextIcon, LogOutIcon, CheckIcon, CloseIcon
} from './Icons';

export interface ChatItem {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  snippet?: string;
}

interface SidebarProps {
  chats: ChatItem[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
  onTogglePin: (chatId: string) => void;
  user: any;
  onOpenSettings: () => void;
  onOpenDocuments: () => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onTogglePin,
  user,
  onOpenSettings,
  onOpenDocuments,
  onLogout,
  onOpenAuth,
  isOpenMobile,
  onCloseMobile
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter((c) => c.is_pinned);
  const unpinnedChats = filteredChats.filter((c) => !c.is_pinned);

  // Group unpinned chats by date
  const now = new Date();
  const todayChats: ChatItem[] = [];
  const yesterdayChats: ChatItem[] = [];
  const pastWeekChats: ChatItem[] = [];
  const olderChats: ChatItem[] = [];

  unpinnedChats.forEach((chat) => {
    const chatDate = new Date(chat.updated_at || chat.created_at);
    const diffDays = Math.floor((now.getTime() - chatDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) todayChats.push(chat);
    else if (diffDays === 1) yesterdayChats.push(chat);
    else if (diffDays <= 7) pastWeekChats.push(chat);
    else olderChats.push(chat);
  });

  const startRename = (chat: ChatItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const saveRename = (chatId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const renderChatItem = (chat: ChatItem) => {
    const isActive = chat.id === activeChatId;
    const isEditing = chat.id === editingChatId;

    if (isEditing) {
      return (
        <form
          key={chat.id}
          onSubmit={(e) => saveRename(chat.id, e)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.1)] my-0.5"
        >
          <input
            type="text"
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => saveRename(chat.id)}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
          />
          <button type="submit" className="text-emerald-400 hover:text-emerald-300">
            <CheckIcon className="w-4 h-4" />
          </button>
        </form>
      );
    }

    return (
      <div
        key={chat.id}
        onClick={() => {
          onSelectChat(chat.id);
          onCloseMobile();
        }}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer my-0.5 ${
          isActive
            ? 'bg-[#21212f] text-white font-medium shadow-sm'
            : 'text-gray-300 hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
        }`}
      >
        <span className="truncate pr-12 text-[13px]">{chat.title}</span>

        {/* Hover Action Buttons */}
        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-[#21212f] via-[#21212f] to-transparent pl-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(chat.id);
            }}
            title={chat.is_pinned ? 'Unpin chat' : 'Pin chat'}
            className={`p-1 rounded hover:bg-[rgba(255,255,255,0.1)] ${chat.is_pinned ? 'text-amber-400' : 'text-gray-400'}`}
          >
            <PinIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => startRename(chat, e)}
            title="Rename"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)]"
          >
            <EditIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this conversation?')) {
                onDeleteChat(chat.id);
              }
            }}
            title="Delete"
            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-[rgba(255,255,255,0.1)]"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col w-[260px] bg-[#171721] border-r border-[rgba(255,255,255,0.08)] transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header / Branding */}
        <div className="flex items-center justify-between p-3.5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/40">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white">ChatGPT Pro</span>
              <span className="block text-[10px] text-emerald-400 uppercase tracking-widest font-mono">Hosted AI</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action: + New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 font-medium text-sm transition-all shadow-sm group"
          >
            <div className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform" />
              <span>New chat</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/40 border border-emerald-500/20 rounded text-emerald-400">
              Ctrl+Shift+O
            </kbd>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-[#1e1e2d] border border-[rgba(255,255,255,0.06)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
          {pinnedChats.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                <PinIcon className="w-3 h-3" />
                <span>Pinned</span>
              </div>
              <div className="space-y-0.5">{pinnedChats.map(renderChatItem)}</div>
            </div>
          )}

          {todayChats.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Today
              </div>
              <div className="space-y-0.5">{todayChats.map(renderChatItem)}</div>
            </div>
          )}

          {yesterdayChats.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Yesterday
              </div>
              <div className="space-y-0.5">{yesterdayChats.map(renderChatItem)}</div>
            </div>
          )}

          {pastWeekChats.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Previous 7 Days
              </div>
              <div className="space-y-0.5">{pastWeekChats.map(renderChatItem)}</div>
            </div>
          )}

          {olderChats.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Older
              </div>
              <div className="space-y-0.5">{olderChats.map(renderChatItem)}</div>
            </div>
          )}

          {chats.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-500">
              No conversations yet.
            </div>
          )}
        </div>

        {/* Bottom User Card */}
        <div className="p-2 border-t border-[rgba(255,255,255,0.06)] relative">
          {user ? (
            <div>
              {userMenuOpen && (
                <div className="absolute bottom-14 left-2 right-2 bg-[#212130] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl p-1.5 space-y-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-gray-200 hover:text-white text-left transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-emerald-400" />
                    <span>Profile & AI Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenDocuments();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-gray-200 hover:text-white text-left transition-colors"
                  >
                    <FileTextIcon className="w-4 h-4 text-cyan-400" />
                    <span>My Documents (RAG)</span>
                  </button>
                  <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 text-left transition-colors"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-all text-left group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                    {user.display_name ? user.display_name.charAt(0) : 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-white truncate">
                      {user.display_name || 'User'}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-white text-xs">•••</div>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md"
            >
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
