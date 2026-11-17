import React, { useState } from 'react';
import {
  OpenAILogo,
  PanelLeftIcon,
  SquarePenIcon,
  SearchIcon,
  MessageSquareIcon,
  TrashIcon,
  UserIcon
} from '../ui/Icons';
import { Conversation } from '../../types/chat';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by date
  const groups: { [key: string]: Conversation[] } = {};
  filtered.forEach(c => {
    if (!groups[c.dateGroup]) groups[c.dateGroup] = [];
    groups[c.dateGroup].push(c);
  });

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days'];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-40 flex flex-col w-[260px] bg-[#f9f9f9] border-r border-[#e5e5e5] transition-all duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:-ml-[260px]'
        }`}
      >
        {/* Top Header: Brand & Toggle */}
        <div className="flex items-center justify-between p-3.5 pb-2">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onNewChat}>
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
              <OpenAILogo className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-black">ChatGPT</span>
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-200/70 transition-colors"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <PanelLeftIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Chat Button */}
        <div className="px-3 py-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100/80 text-black text-xs font-medium transition-all shadow-xs group"
          >
            <div className="flex items-center gap-2.5">
              <SquarePenIcon className="w-4 h-4 text-gray-700" />
              <span>New chat</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-200 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Search input if multiple conversations */}
        {conversations.length > 3 && (
          <div className="px-3 py-1">
            <div className="relative flex items-center">
              <SearchIcon className="absolute left-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black text-black placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 scrollbar-thin">
          {groupOrder.map((group) => {
            const items = groups[group];
            if (!items || items.length === 0) return null;

            return (
              <div key={group} className="space-y-0.5">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {group}
                </div>
                {items.map((item) => {
                  const isActive = item.id === activeId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectConversation(item.id)}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#ececec] text-black font-semibold'
                          : 'text-gray-700 hover:bg-[#eaeaea] hover:text-black'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        <MessageSquareIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </div>

                      {/* Delete action on hover */}
                      <button
                        onClick={(e) => onDeleteConversation(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-black transition-opacity"
                        title="Delete chat"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {conversations.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">
              No chat history yet.
            </div>
          )}
        </div>

        {/* Bottom User Profile */}
        <div className="p-3 border-t border-[#e5e5e5] bg-[#f9f9f9]">
          <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-200/60 cursor-pointer transition-colors">
            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-black truncate">Pro Member</div>
              <div className="text-[10px] text-gray-400 truncate">Free Plan &bull; Upgrade</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
