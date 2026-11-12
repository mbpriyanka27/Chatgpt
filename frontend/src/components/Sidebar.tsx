import React, { useState } from 'react';
import {
  SparklesIcon, PlusIcon, SearchIcon, PinIcon,
  EditIcon, TrashIcon, SettingsIcon, FileTextIcon, LogOutIcon, CheckIcon, CloseIcon,
  NewChatPenIcon, SidebarCollapseIcon
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

  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 shadow-sm my-0.5"
        >
          <input
            type="text"
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => saveRename(chat.id)}
            className="flex-1 bg-transparent text-sm text-[#111827] focus:outline-none"
          />
          <button type="submit" className="text-emerald-600 hover:text-emerald-700">
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
            ? 'bg-[#ECECF1] text-[#111827] font-medium shadow-xs'
            : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
        }`}
      >
        <span className="truncate pr-10 text-[13px]">{chat.title}</span>

        {/* Hover Action Buttons */}
        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent pl-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(chat.id);
            }}
            title={chat.is_pinned ? 'Unpin chat' : 'Pin chat'}
            className={`p-1 rounded hover:bg-gray-200 ${chat.is_pinned ? 'text-amber-500' : 'text-gray-400'}`}
          >
            <PinIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => startRename(chat, e)}
            title="Rename"
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200"
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
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200"
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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col w-[260px] bg-[#F9F9F9] border-r border-[#E5E7EB] transition-transform duration-300 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header / Branding (ChatGPT Cloud) */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200/60">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={onNewChat}>
            <span className="font-bold text-[17px] tracking-tight text-[#0D0D0D]">ChatGPT</span>
            <span className="font-bold text-[17px] tracking-tight text-[#0D9488]">Cloud</span>
          </div>

          <div className="flex items-center gap-1 text-[#6B7280]">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              title="Search chats"
              className="p-1.5 rounded-lg hover:bg-gray-200/70 hover:text-black transition-colors"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onCloseMobile}
              title="Sidebar controls"
              className="p-1.5 rounded-lg hover:bg-gray-200/70 hover:text-black transition-colors"
            >
              <SidebarCollapseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action: 📝 New chat Button */}
        <div className="p-3 pb-2">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#ECECF1] hover:bg-[#E5E7EB] text-[#1F2937] font-medium text-sm transition-all shadow-xs group"
          >
            <div className="flex items-center gap-2.5">
              <NewChatPenIcon className="w-4 h-4 text-[#4B5563]" />
              <span className="text-[13px] font-medium">New chat</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-gray-500">
              Ctrl+Shift+O
            </kbd>
          </button>
        </div>

        {/* Search Input (Collapsible or always cleanly visible when open) */}
        {isSearchOpen && (
          <div className="px-3 pb-2">
            <div className="relative flex items-center">
              <SearchIcon className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>
          </div>
        )}

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-300">
          <div>
            <div className="px-3 pt-2 pb-1 text-[12px] font-medium text-[#6B7280]">
              Recents
            </div>

            {pinnedChats.length > 0 && (
              <div className="space-y-0.5 mb-2">
                {pinnedChats.map(renderChatItem)}
              </div>
            )}

            <div className="space-y-0.5">
              {unpinnedChats.map(renderChatItem)}
            </div>
          </div>

          {chats.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">
              No conversations yet.
            </div>
          )}
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-3 border-t border-gray-200/80 bg-[#F9F9F9] relative">
          {user ? (
            <div className="flex items-center justify-between">
              {userMenuOpen && (
                <div className="absolute bottom-14 left-2 right-2 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 space-y-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black text-left transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-emerald-600" />
                    <span>Profile & AI Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenDocuments();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black text-left transition-colors"
                  >
                    <FileTextIcon className="w-4 h-4 text-teal-600" />
                    <span>My Documents (RAG)</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-left transition-colors"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}

              {/* User Avatar + Name */}
              <div
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 overflow-hidden cursor-pointer flex-1 group"
              >
                <div className="w-7 h-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-xs">
                  {user.display_name ? user.display_name.charAt(0) : 'D'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[13px] font-semibold text-[#111827] truncate group-hover:text-emerald-700 transition-colors">
                    {user.display_name || 'Divya Gadwal'}
                  </div>
                </div>
              </div>

              {/* Action Icons: Settings & Logout */}
              <div className="flex items-center gap-0.5 text-[#6B7280]">
                <button
                  onClick={onOpenSettings}
                  title="Settings"
                  className="p-1.5 rounded-lg hover:bg-gray-200/70 hover:text-black transition-colors"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg hover:bg-gray-200/70 hover:text-red-600 transition-colors"
                >
                  <LogOutIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-xs"
            >
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

