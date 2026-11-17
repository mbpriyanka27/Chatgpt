import React from 'react';
import { PanelLeftIcon, SquarePenIcon } from '../ui/Icons';

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  title?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onNewChat,
  title = "ChatGPT"
}) => {
  return (
    <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 bg-white/95 backdrop-blur-xs sticky top-0 z-20 select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
          title={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          aria-label="Toggle sidebar"
        >
          <PanelLeftIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
          <span className="font-semibold text-sm text-black tracking-tight">{title}</span>
          <span className="text-[10px] text-gray-400">▾</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors md:hidden"
          title="New chat"
        >
          <SquarePenIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
