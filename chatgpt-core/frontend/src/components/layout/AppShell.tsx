import React from 'react';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
  appName?: string;
  version?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  appName = "ChatGPT Core Platform",
  version = "1.0.0"
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header appName={appName} version={version} />
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        Modular AI Architecture &bull; Ready for Chat & RAG Integration
      </footer>
    </div>
  );
};
