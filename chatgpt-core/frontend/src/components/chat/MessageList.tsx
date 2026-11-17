import React from 'react';
import { Message } from '../../types/chat';
import { OpenAILogo, UserIcon } from '../ui/Icons';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {/* Assistant Avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <OpenAILogo className="w-4 h-4" />
              </div>
            )}

            {/* Message Bubble / Content */}
            <div
              className={`max-w-[85%] text-sm leading-relaxed ${
                isUser
                  ? 'bg-[#f4f4f4] text-black px-4 py-2.5 rounded-3xl rounded-br-sm'
                  : 'text-[#171717] px-1 py-1'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
              <span className="text-[10px] text-gray-400 mt-1 block select-none">
                {msg.timestamp}
              </span>
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
