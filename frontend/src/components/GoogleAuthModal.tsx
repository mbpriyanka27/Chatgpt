import React, { useState } from 'react';
import { CloseIcon, GoogleIcon } from './Icons';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  apiUrl: string;
}

export function GoogleAuthModal({ isOpen, onClose, onSuccess, apiUrl }: GoogleAuthModalProps) {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const defaultGoogleAccounts = [
    {
      name: 'Divya Gadwal',
      email: 'divya.gadwal@gmail.com',
      avatar: 'D',
      color: 'bg-orange-500'
    },
    {
      name: 'Yashwanth V S',
      email: 'yashwanth.vs@gmail.com',
      avatar: 'Y',
      color: 'bg-blue-600'
    }
  ];

  const handleSignIn = async (email: string, displayName: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          display_name: displayName.trim() || email.split('@')[0],
          photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || email)}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Google sign-in failed');

      localStorage.setItem('chatgpt_token', data.access_token);
      localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
      onSuccess(data.access_token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div className="flex items-center gap-2.5">
            <GoogleIcon className="w-5 h-5" />
            <h2 className="text-base font-semibold text-gray-900 font-sans">
              Sign in with Google
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Choose an account to continue to <strong>ChatGPT Pro</strong>
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Account list */}
        <div className="space-y-2 mb-4">
          {defaultGoogleAccounts.map((acc, i) => (
            <button
              key={i}
              onClick={() => handleSignIn(acc.email, acc.name)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
            >
              <div className={`w-9 h-9 rounded-full ${acc.color} text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0`}>
                {acc.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 group-hover:text-black truncate">
                  {acc.name}
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {acc.email}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Google Email Option */}
        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="w-full py-2.5 text-center text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
          >
            Use another Google account
          </button>
        ) : (
          <div className="pt-2 border-t border-gray-100 space-y-2.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Your Google Email
              </label>
              <input
                type="email"
                placeholder="name@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Divya"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => handleSignIn(customEmail, customName)}
              disabled={loading || !customEmail.includes('@')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-xs ${
                loading || !customEmail.includes('@')
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign in with this Google Account'}
            </button>
          </div>
        )}

        <div className="mt-5 text-[11px] text-gray-400 text-center">
          To continue, Google will share your name and email address with ChatGPT Pro.
        </div>
      </div>
    </div>
  );
}

