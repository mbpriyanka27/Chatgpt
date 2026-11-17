import React from 'react';
import { AppShell } from './components/layout/AppShell';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { useHealth } from './hooks/useHealth';

export function App() {
  const { health, isLoading, error, refetch } = useHealth();

  return (
    <AppShell appName="ChatGPT Core Platform" version="1.0.0">
      <div className="space-y-6">
        {/* Architecture Status Banner */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-gray-900">System Architecture Scaffold</h2>
                {isLoading ? (
                  <Badge variant="warning">Checking API...</Badge>
                ) : health ? (
                  <Badge variant="success">Backend Connected</Badge>
                ) : (
                  <Badge variant="error">API Offline</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Foundational architecture setup with React, TypeScript, Tailwind, and FastAPI backend.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              isLoading={isLoading}
            >
              Test Backend Connection
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <strong>Connection Notice:</strong> {error}. Start the backend server on port 8000 to connect.
            </div>
          )}

          {health && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200/80 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-400 block">Status:</span>
                <span className="text-emerald-600 font-semibold uppercase">{health.status}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Project:</span>
                <span className="text-gray-800 font-semibold">{health.project}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Version:</span>
                <span className="text-gray-800 font-semibold">{health.version}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Server Timestamp:</span>
                <span className="text-gray-800">{new Date(health.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modules & Structure Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-3">
              TS
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Frontend Scaffold</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              React 18, TypeScript, Tailwind CSS, modular component layout, custom hooks, and typed API clients.
            </p>
            <div className="text-[11px] font-mono text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100">
              chatgpt-core/frontend/src/
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-3">
              API
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">FastAPI Backend</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              FastAPI, Pydantic schemas, CORS middleware, centralized configuration, and health endpoints.
            </p>
            <div className="text-[11px] font-mono text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100">
              chatgpt-core/backend/app/
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg mb-3">
              AI
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">AI Pipeline Ready</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Pre-configured slots for LLM streaming (SSE), vector database (pgvector), and Google OAuth authentication.
            </p>
            <div className="text-[11px] font-mono text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100">
              chatgpt-core/backend/app/services/
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default App;
