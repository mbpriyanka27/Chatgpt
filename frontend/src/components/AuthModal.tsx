import React, { useState } from 'react';
import { SparklesIcon, CloseIcon, GoogleIcon } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
  onOpenGoogleAuth?: () => void;
  apiUrl: string;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess, onOpenGoogleAuth, apiUrl }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleClick = () => {
    if (onOpenGoogleAuth) {
      onClose();
      onOpenGoogleAuth();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        localStorage.setItem('chatgpt_token', data.access_token);
        localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
        onLoginSuccess(data.access_token, data.user);
        onClose();
      } else {
        const res = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, display_name: displayName || email.split('@')[0] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');

        localStorage.setItem('chatgpt_token', data.access_token);
        localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
        onLoginSuccess(data.access_token, data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[390px] rounded-[28px] bg-white border border-gray-100 p-8 shadow-2xl text-gray-900 font-sans">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <CloseIcon className="w-4 h-4" />
        </button>

        {/* ChatGPT Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-3.5 shadow-md">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Welcome to ChatGPT
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
            Log in or sign up with your Google account to get started
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Primary Action: Continue with Google (Authentic ChatGPT Button) */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleClick}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center my-5 text-xs text-gray-400">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">OR</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Email Option Toggle */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full py-2.5 px-4 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium text-xs transition-colors cursor-pointer text-center"
          >
            Sign in with email address
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Divya Gadwal"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-black"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-full bg-black hover:bg-gray-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer mt-2"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Continue' : 'Create Account'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[11px] text-gray-500 hover:text-black font-medium"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
              </button>
            </div>
          </form>
        )}

        {/* Footer Terms */}
        <div className="mt-6 text-[10px] text-gray-400 text-center leading-relaxed">
          By continuing, you agree to ChatGPT's <span className="underline hover:text-gray-600 cursor-pointer">Terms of Use</span> and <span className="underline hover:text-gray-600 cursor-pointer">Privacy Policy</span>.
        </div>
      </div>
    </div>
  );
}
