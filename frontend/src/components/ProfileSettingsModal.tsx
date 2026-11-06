import React, { useState } from 'react';
import { CloseIcon, SettingsIcon, TrashIcon } from './Icons';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  token: string | null;
  apiUrl: string;
  onUserUpdated: (updatedUser: any) => void;
  onClearAllChats: () => void;
  onAccountDeleted: () => void;
}

export function ProfileSettingsModal({
  isOpen,
  onClose,
  user,
  token,
  apiUrl,
  onUserUpdated,
  onClearAllChats,
  onAccountDeleted
}: ProfileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'model' | 'data'>('profile');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [theme, setTheme] = useState(user?.theme || 'dark');
  const [systemPrompt, setSystemPrompt] = useState(
    user?.default_system_prompt || "You are ChatGPT, a large language model. Follow the user's instructions carefully."
  );
  const [temperature, setTemperature] = useState(user?.temperature || 0.7);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatgpt_api_key') || '';
    }
    return '';
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setStatusMsg('');

    if (typeof window !== 'undefined') {
      localStorage.setItem('chatgpt_api_key', apiKey.trim());
    }

    try {
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName,
          theme: theme,
          default_system_prompt: systemPrompt,
          temperature: parseFloat(temperature.toString())
        })
      });

      if (res.ok) {
        setStatusMsg('Settings saved successfully!');
        const updated = {
          ...user,
          display_name: displayName,
          theme: theme,
          default_system_prompt: systemPrompt,
          temperature: temperature
        };
        localStorage.setItem('chatgpt_user', JSON.stringify(updated));
        onUserUpdated(updated);
        setTimeout(() => setStatusMsg(''), 2500);
      }
    } catch (err: any) {
      setStatusMsg('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    if (confirm('Are you ABSOLUTELY sure? This will delete your account, all chats, and uploaded documents permanently.')) {
      try {
        await fetch(`${apiUrl}/api/auth/account`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        onAccountDeleted();
      } catch (err) {
        console.error('Failed to delete account:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#1e1e2f] border border-[rgba(255,255,255,0.1)] p-6 shadow-2xl text-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Settings & Profile</h2>
              <p className="text-xs text-gray-400">Customize your assistant persona, model parameters, and workspace.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-[rgba(255,255,255,0.08)] mt-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            General Profile
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'model'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Hosted LLM Inference
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'data'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Data & Privacy
          </button>
        </div>

        {statusMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300">
            {statusMsg}
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs scrollbar-thin">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#2a2b3d] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Email</label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-[#1b1b28] border border-[rgba(255,255,255,0.06)] rounded-xl px-3.5 py-2 text-sm text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full bg-[#2a2b3d] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="dark">Dark Theme (ChatGPT Executive)</option>
                  <option value="light">Light Theme</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Hosted Model Endpoint</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#2a2b3d] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="llama-3.3-70b-versatile">⚡ LLaMA 3.3 70B Versatile (Hosted Groq / Cloud)</option>
                  <option value="gpt-4o-mini">🧠 GPT-4o-mini (Hosted OpenAI)</option>
                  <option value="qwen/qwen-2.5-72b-instruct">🚀 Qwen 2.5 72B Instruct (Hosted OpenRouter / HF)</option>
                  <option value="mixtral-8x7b-32768">🔥 Mixtral 8x7B MoE (Hosted Cloud)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Hosted LLM API Key (Groq / OpenAI / OpenRouter)
                </label>
                <input
                  type="password"
                  placeholder="gsk_... or sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#2a2b3d] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  🚀 Tip: Enter a free key from <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">console.groq.com</a> for 500 tokens/sec speed! Leave blank to use the warm in-memory model.
                </p>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">System Instructions</label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-[#2a2b3d] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-gray-300 font-medium">Temperature (Creativity)</label>
                  <span className="font-mono text-emerald-400">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                  <span>0.0 (Precise / Code)</span>
                  <span>0.7 (Balanced)</span>
                  <span>1.5 (Creative)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 space-y-3">
                <div className="font-semibold text-red-300">Danger Zone</div>
                <p className="text-gray-400 text-xs">
                  Permanently delete conversations or close your account.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onClearAllChats}
                    className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-red-500/20 text-gray-200 hover:text-red-300 border border-[rgba(255,255,255,0.1)] text-xs font-medium"
                  >
                    Clear All Chats
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 text-xs font-medium"
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-[rgba(255,255,255,0.08)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-xs text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium transition-colors shadow-lg shadow-emerald-900/30"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

