import React from 'react';
import {
  OpenAILogo,
  CodeIcon,
  CompassIcon,
  LightbulbIcon,
  SparklesIcon
} from '../ui/Icons';
import { PromptSuggestion } from '../../types/chat';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string) => void;
}

const DEFAULT_SUGGESTIONS: (PromptSuggestion & { icon: React.ReactNode })[] = [
  {
    id: '1',
    title: 'Explain complex concepts',
    description: 'Break down quantum computing in simple terms',
    prompt: 'Explain quantum computing using simple real-world analogies.',
    category: 'Learn',
    icon: <LightbulbIcon className="w-4 h-4 text-black" />,
  },
  {
    id: '2',
    title: 'Write & debug code',
    description: 'Design a clean TypeScript API service with error handling',
    prompt: 'Write a clean TypeScript service class with typed fetch and robust error handling.',
    category: 'Code',
    icon: <CodeIcon className="w-4 h-4 text-black" />,
  },
  {
    id: '3',
    title: 'Brainstorm creative ideas',
    description: 'Generate high-impact product naming options',
    prompt: 'Brainstorm 5 catchy, minimalist brand names for an AI productivity app.',
    category: 'Ideate',
    icon: <SparklesIcon className="w-4 h-4 text-black" />,
  },
  {
    id: '4',
    title: 'Analyze & synthesize',
    description: 'Summarize key tradeoffs in modern microservices',
    prompt: 'Compare monolithic vs microservices architecture focusing on scalability tradeoffs.',
    category: 'Plan',
    icon: <CompassIcon className="w-4 h-4 text-black" />,
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto px-4 w-full py-8 text-center animate-fade-in select-none">
      {/* Brand Icon Mark */}
      <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-6 shadow-sm">
        <OpenAILogo className="w-7 h-7" />
      </div>

      {/* Centered Welcome Headline */}
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black mb-8">
        What can I help with today?
      </h2>

      {/* 2x2 Responsive Prompt Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {DEFAULT_SUGGESTIONS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col justify-between p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50/80 hover:border-gray-400/80 transition-all text-left shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-semibold text-black tracking-tight group-hover:text-black">
                {item.title}
              </span>
              <div className="p-1 rounded-md bg-gray-100 group-hover:bg-gray-200/80 transition-colors">
                {item.icon}
              </div>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
