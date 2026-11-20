'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- INLINE ICONS FOR ROBUST STANDALONE RENDERING ---
function OpenAILogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1636a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6726a.79.79 0 0 0-.401-.6906zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.907 9.2297V6.8974a.0662.0662 0 0 1 .0331-.0615L13.8828 4.05a4.4992 4.4992 0 0 1 6.568 4.6775zM12 13.725l-2.4367-1.4053 2.4367-1.4052 2.4367 1.4052z" />
    </svg>
  );
}

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  );
}

function EyeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

interface LoginPageProps {
  initialMode?: AuthMode;
  onSuccess?: (token: string, user: any) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export default function LoginPage({
  initialMode = 'login',
  onSuccess,
  onCancel,
  isModal = false,
}: LoginPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Multi-account Google Picker state
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    clearMessages();
    setMode(newMode);
  };

  // Google OAuth Login Action
  const handleGoogleLogin = async (selectedAccount?: { email: string; name: string; avatar?: string }) => {
    clearMessages();
    setLoading(true);

    try {
      const emailToUse = selectedAccount?.email || 'user.workspace@gmail.com';
      const nameToUse = selectedAccount?.name || 'Google User';
      const avatarToUse = selectedAccount?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces';

      const res = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse,
          display_name: nameToUse,
          photo_url: avatarToUse,
          credential: null
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Google authentication failed');

      localStorage.setItem('chatgpt_token', data.access_token);
      localStorage.setItem('chatgpt_user', JSON.stringify(data.user));

      setSuccessMessage('Successfully signed in with Google!');
      if (onSuccess) {
        onSuccess(data.access_token, data.user);
      } else {
        setTimeout(() => router.push('/'), 400);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in encountered an error.');
    } finally {
      setLoading(false);
      setShowGoogleChooser(false);
    }
  };

  // Email / Password Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid email or password');

        localStorage.setItem('chatgpt_token', data.access_token);
        localStorage.setItem('chatgpt_user', JSON.stringify(data.user));

        setSuccessMessage('Welcome back! Logging you in...');
        if (onSuccess) {
          onSuccess(data.access_token, data.user);
        } else {
          setTimeout(() => router.push('/'), 400);
        }

      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const res = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            display_name: displayName.trim() || email.split('@')[0],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');

        localStorage.setItem('chatgpt_token', data.access_token);
        localStorage.setItem('chatgpt_user', JSON.stringify(data.user));

        setSuccessMessage('Account created successfully! Welcome to ChatGPT.');
        if (onSuccess) {
          onSuccess(data.access_token, data.user);
        } else {
          setTimeout(() => router.push('/'), 400);
        }

      } else if (mode === 'forgot-password') {
        if (!email.trim()) throw new Error('Please enter your email address');

        const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to dispatch password reset');

        if (data.reset_token) {
          setResetToken(data.reset_token);
          setSuccessMessage(`Reset token generated: ${data.reset_token.slice(0, 8)}... (auto-filled below)`);
          setMode('reset-password');
        } else {
          setSuccessMessage(data.message || 'If registered, password reset instructions have been dispatched.');
        }

      } else if (mode === 'reset-password') {
        if (!resetToken.trim()) throw new Error('Please provide the reset token');
        if (newPassword.length < 6) throw new Error('New password must be at least 6 characters long');

        const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: resetToken.trim(),
            new_password: newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid or expired reset token');

        setSuccessMessage('Password reset successfully! You can now log in.');
        setMode('login');
        setPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Google Accounts for Multi-Account Selector
  const sampleGoogleAccounts = [
    {
      id: 'acc-1',
      name: 'Primary Workspace',
      email: email.includes('@') ? email : 'user.workspace@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      status: 'Active session'
    },
    {
      id: 'acc-2',
      name: 'Developer Account',
      email: 'developer.lead@company.org',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      status: 'Signed in'
    },
    {
      id: 'acc-3',
      name: 'Personal Account',
      email: 'personal.user@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      status: 'Available'
    }
  ];

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between items-center text-white bg-[#171717] px-4 py-8 font-sans selection:bg-neutral-700 selection:text-white ${
        isModal ? 'min-h-auto' : ''
      }`}
    >
      {/* Top Bar / Brand */}
      <div className="w-full max-w-[420px] flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md">
            <OpenAILogo className="w-5 h-5 text-black" />
          </div>
          <span className="font-semibold text-base tracking-tight text-white">ChatGPT</span>
        </div>

        {isModal && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#262626] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-[420px] my-auto">
        <div className="bg-[#212121] border border-[#2f2f2f] rounded-2xl p-6 sm:p-8 shadow-2xl transition-all">
          {/* Header Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight mb-2">
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot-password' && 'Reset your password'}
              {mode === 'reset-password' && 'Enter new password'}
            </h1>
            <p className="text-xs text-gray-400 max-w-[320px] mx-auto leading-relaxed">
              {mode === 'login' && 'Log in with your Google account or email to continue.'}
              {mode === 'signup' && 'Sign up to start chatting, generating images, and exploring AI.'}
              {mode === 'forgot-password' && 'Enter your verified email to receive a password reset token.'}
              {mode === 'reset-password' && 'Provide your reset token and enter your new secure password.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-950/40 border border-red-800/60 p-3 text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
              <span className="text-red-400 mt-0.5 text-sm">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-3 text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
              <span className="text-emerald-400 mt-0.5 text-sm">✓</span>
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* ======================================================== */}
          {/* GOOGLE OAUTH SECTION (For Login & Signup) */}
          {/* ======================================================== */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="space-y-3 mb-5">
              <button
                type="button"
                onClick={() => setShowGoogleChooser(!showGoogleChooser)}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#2a2a2a] hover:bg-[#333333] border border-[#3e3e3e] text-white font-medium text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] group"
              >
                <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                <span>Continue with Google</span>
              </button>

              {/* Multi-Account Google Chooser Modal/Dropdown */}
              {showGoogleChooser && (
                <div className="rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-3 space-y-2 animate-in fade-in duration-150">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                    Choose a Google Account
                  </div>
                  {sampleGoogleAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleGoogleLogin(acc)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#282828] transition-colors text-left cursor-pointer group"
                    >
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="w-8 h-8 rounded-full object-cover border border-[#444]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-400 truncate">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{acc.email}</div>
                      </div>
                      <span className="text-[10px] text-gray-500 bg-[#252525] px-2 py-0.5 rounded-full">
                        {acc.status}
                      </span>
                    </button>
                  ))}
                  <div className="pt-1 border-t border-[#2a2a2a] flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowGoogleChooser(false)}
                      className="text-[11px] text-gray-400 hover:text-white px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Minimalist Divider */}
              <div className="flex items-center my-4 text-xs text-gray-500">
                <div className="flex-1 border-t border-[#333333]" />
                <span className="px-3 text-[11px] font-semibold text-gray-500 tracking-wider">OR</span>
                <div className="flex-1 border-t border-[#333333]" />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* EMAIL & PASSWORD FORM */}
          {/* ======================================================== */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (Only in Sign Up mode) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Display name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Divya Gadwal"
                  className="w-full bg-[#181818] border border-[#383838] focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>
            )}

            {/* Email Field (in Login, Sign Up, and Forgot Password modes) */}
            {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#181818] border border-[#383838] focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>
            )}

            {/* Password Field with Show/Hide Toggle (Login & Sign Up modes) */}
            {(mode === 'login' || mode === 'signup') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('forgot-password')}
                      className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#181818] border border-[#383838] focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-gray-500 transition-colors outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Reset Password Step 2 Fields */}
            {mode === 'reset-password' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter reset token from prompt or email"
                    className="w-full bg-[#181818] border border-[#383838] focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-[#181818] border border-[#383838] focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-gray-500 transition-colors outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition-all shadow-md cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin w-4 h-4 text-black" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Continue'
                  : mode === 'signup'
                  ? 'Create account'
                  : mode === 'forgot-password'
                  ? 'Send reset link'
                  : 'Update password'}
              </span>
            </button>
          </form>

          {/* Mode Switchers / Footer Links */}
          <div className="mt-6 pt-4 border-t border-[#2e2e2e] text-center text-xs space-y-2">
            {mode === 'login' && (
              <p className="text-gray-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signup')}
                  className="text-white hover:underline font-medium cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p className="text-gray-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="text-white hover:underline font-medium cursor-pointer"
                >
                  Log in
                </button>
              </p>
            )}

            {(mode === 'forgot-password' || mode === 'reset-password') && (
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Return to log in</span>
              </button>
            )}
          </div>
        </div>

        {/* Security & Terms Notice */}
        <div className="mt-6 text-[11px] text-gray-500 text-center leading-relaxed max-w-[340px] mx-auto">
          By continuing, you agree to ChatGPT's{' '}
          <span className="text-gray-400 hover:text-white cursor-pointer underline">Terms of Use</span> and{' '}
          <span className="text-gray-400 hover:text-white cursor-pointer underline">Privacy Policy</span>.
        </div>
      </div>

      {/* Bottom Footer Credits */}
      <footer className="w-full text-center text-[11px] text-gray-500 py-4 mt-auto">
        <span>ChatGPT &copy; {new Date().getFullYear()} OpenAI &bull; LocalGPT Pro Authentication</span>
      </footer>
    </div>
  );
}
