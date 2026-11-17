import React from 'react';

interface HeaderProps {
  appName: string;
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ appName, version }) => {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          AI
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 tracking-tight">{appName}</h1>
          <p className="text-[11px] text-gray-400 font-mono">v{version}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
          Architecture Scaffold
        </span>
      </div>
    </header>
  );
};
