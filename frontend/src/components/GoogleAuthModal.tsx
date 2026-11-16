import React, { useState } from 'react';
import { CloseIcon, GoogleIcon } from './Icons';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  apiUrl: string;
}

export function GoogleAuthModal({ isOpen, onClose, onSuccess, apiUrl }: GoogleAuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  
  // Sign in fields
  const [signInEmail, setSignInEmail] = useState('');
  const [showOtherAccount, setShowOtherAccount] = useState(false);

  // Registration fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const quickGoogleProfiles = [
    {
      name: 'Divya Gadwal',
      email: 'divya.gadwal@gmail.com',
      avatar: 'D',
      bg: 'bg-orange-600'
    },
    {
      name: 'Yashwanth V S',
      email: 'yashwanth.vs@gmail.com',
      avatar: 'Y',
      bg: 'bg-blue-600'
    }
  ];

  const handleGoogleAuth = async (email: string, displayName: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalName = displayName.trim() || cleanEmail.split('@')[0].replace('.', ' ');
      const avatarSeed = encodeURIComponent(finalName);
      const photoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}&backgroundColor=0284c7,ea580c,16a34a,7c3aed`;

      const endpoint = tab === 'register' ? `${apiUrl}/api/auth/google/register` : `${apiUrl}/api/auth/google`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          display_name: finalName,
          photo_url: photoUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Google authentication failed');
      }

      localStorage.setItem('chatgpt_token', data.access_token);
      localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
      onSuccess(data.access_token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google authentication encountered an issue.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    let email = regEmail.trim();
    if (!email) {
      setError('Google email is required.');
      return;
    }
    if (!email.includes('@')) {
      email = `${email}@gmail.com`;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    handleGoogleAuth(email, fullName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl border border-gray-100 p-8 overflow-hidden font-sans">
        
        {/* Top Google Logo & Close */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 tracking-tight">Google Accounts</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Header Title */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {tab === 'signin' ? 'Sign in with Google' : 'Create your Google Account'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            to continue to <strong className="text-gray-800">ChatGPT Cloud Pro</strong>
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 mb-5">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 pb-2.5 text-xs font-semibold text-center transition-colors relative ${
              tab === 'signin'
                ? 'text-[#1a73e8] border-b-2 border-[#1a73e8]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 pb-2.5 text-xs font-semibold text-center transition-colors relative ${
              tab === 'register'
                ? 'text-[#1a73e8] border-b-2 border-[#1a73e8]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Create / Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
            <span className="font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Google Sign In */}
        {tab === 'signin' && (
          <div>
            <p className="text-[12px] font-medium text-gray-700 mb-2.5">
              Choose an active Google profile:
            </p>

            {/* Quick Profile Cards */}
            <div className="space-y-2 mb-4">
              {quickGoogleProfiles.map((prof, i) => (
                <button
                  key={i}
                  onClick={() => handleGoogleAuth(prof.email, prof.name)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-full ${prof.bg} text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0`}>
                    {prof.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                      {prof.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {prof.email}
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Select →
                  </span>
                </button>
              ))}
            </div>

            {/* Use Another Account Toggle */}
            {!showOtherAccount ? (
              <button
                onClick={() => setShowOtherAccount(true)}
                className="w-full py-2.5 px-4 text-center text-xs font-semibold text-[#1a73e8] hover:bg-blue-50/60 rounded-xl transition-colors cursor-pointer"
              >
                + Use another Google account
              </button>
            ) : (
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                  />
                </div>
                <button
                  onClick={() => handleGoogleAuth(signInEmail, '')}
                  disabled={loading || !signInEmail.includes('@')}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-xs cursor-pointer ${
                    loading || !signInEmail.includes('@')
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#1a73e8] hover:bg-[#1557b0]'
                  }`}
                >
                  {loading ? 'Authenticating...' : 'Sign in with this Google Email'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Google Registration */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Divya"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  placeholder="Gadwal"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Google / Gmail Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="divya.gadwal@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                You can use letters, numbers & periods. E.g. name@gmail.com
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !firstName.trim() || !regEmail.trim()}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-xs cursor-pointer ${
                  loading || !firstName.trim() || !regEmail.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#1a73e8] hover:bg-[#1557b0]'
                }`}
              >
                {loading ? 'Creating Google Account...' : 'Register & Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Footer Disclaimer */}
        <div className="mt-6 pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center leading-relaxed">
          Google will share your name, email address, and profile picture with ChatGPT Pro in accordance with their Privacy Policy.
        </div>
      </div>
    </div>
  );
}
