import React, { useRef, useEffect } from 'react';
import { ArrowUpIcon, PaperclipIcon } from '../ui/Icons';

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Message ChatGPT..."
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit();
      }
    }
  };

  const isSendDisabled = !value.trim();

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Rounded Capsule Input Box */}
      <div className="relative flex flex-col rounded-3xl border border-gray-300 bg-[#f4f4f4] focus-within:border-gray-500 focus-within:bg-white transition-all shadow-xs p-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-black placeholder-gray-400 focus:outline-none max-h-44 leading-relaxed"
        />

        {/* Action Toolbar */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-1 text-gray-500">
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-gray-200/70 hover:text-black transition-colors"
              title="Attach document or file"
            >
              <PaperclipIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSendDisabled}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isSendDisabled
                ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:opacity-90 shadow-xs cursor-pointer'
            }`}
            title="Send message"
            aria-label="Send message"
          >
            <ArrowUpIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Disclaimer Notice */}
      <p className="text-[11px] text-gray-400 text-center mt-2 font-normal select-none">
        ChatGPT can make mistakes. Verify important information.
      </p>
    </div>
  );
};
