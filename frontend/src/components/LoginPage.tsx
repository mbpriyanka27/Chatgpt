'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// --- CLEAN MINIMALIST ICONS ---
function OpenAILogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1636a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6726a.79.79 0 0 0-.401-.6906zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.907 9.2297V6.8974a.0662.0662 0 0 1 .0331-.0615L13.8828 4.05a4.4992 4.4992 0 0 1 6.568 4.6775zM12 13.725l-2.4367-1.4053 2.4367-1.4052 2.4367 1.4052z" />
    </svg>
  );
}

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
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

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Feedback States
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
        setTimeout(() => router.push('/'), 300);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in encountered an error.');
    } finally {
      setLoading(false);
      setShowGoogleChooser(false);
    }
  };

  // Form Submission Handler
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

        setSuccessMessage('Welcome back! Logging in...');
        if (onSuccess) {
          onSuccess(data.access_token, data.user);
        } else {
          setTimeout(() => router.push('/'), 300);
        }

      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
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

        setSuccessMessage('Account created successfully!');
        if (onSuccess) {
          onSuccess(data.access_token, data.user);
        } else {
          setTimeout(() => router.push('/'), 300);
        }

      } else if (mode === 'forgot-password') {
        if (!email.trim()) throw new Error('Please enter your email address');

        const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to request reset token');

        if (data.reset_token) {
          setResetToken(data.reset_token);
          setSuccessMessage(`Reset token: ${data.reset_token.slice(0, 8)}... (auto-filled below)`);
          setMode('reset-password');
        } else {
          setSuccessMessage(data.message || 'If registered, reset instructions have been dispatched.');
        }

      } else if (mode === 'reset-password') {
        if (!resetToken.trim()) throw new Error('Please provide the reset token');
        if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

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

        setSuccessMessage('Password updated successfully! You can now log in.');
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

  // Google Profiles for Account Switcher
  const sampleGoogleAccounts = [
    {
      id: 'acc-1',
      name: 'Primary Workspace',
      email: email.includes('@') ? email : 'user.workspace@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      status: 'Active'
    },
    {
      id: 'acc-2',
      name: 'Developer Account',
      email: 'developer.lead@company.org',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      status: 'Signed in'
    }
  ];

  // ========================================================
  // COMPACT 400PX CENTERED CARD
  // ========================================================
  const cardContent = (
    <div className="w-full max-w-[400px] bg-[#181818] border border-[#2e2e2e] rounded-2xl p-7 sm:p-8 shadow-2xl relative text-white font-sans mx-auto">
      {/* Modal Close Button */}
      {isModal && onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      )}

      {/* Header with OpenAI Logo */}
      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mx-auto mb-3.5 shadow-sm">
          <OpenAILogo className="w-5 h-5 text-black" />
        </div>
        <h1 className="text-xl sm:text-[22px] font-semibold text-white tracking-tight">
          {mode === 'login' && 'Welcome back'}
          {mode === 'signup' && 'Create your account'}
          {mode === 'forgot-password' && 'Reset your password'}
          {mode === 'reset-password' && 'Enter new password'}
        </h1>
        <p className="text-xs text-gray-400 mt-1.5 leading-normal">
          {mode === 'login' && 'Log in to your account to continue'}
          {mode === 'signup' && 'Sign up to start chatting and exploring AI'}
          {mode === 'forgot-password' && 'Enter your email to receive a reset token'}
          {mode === 'reset-password' && 'Enter your reset token and new password'}
        </p>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-950/40 border border-red-800/40 px-3.5 py-2 text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
          <span className="text-red-400 text-sm">⚠️</span>
          <span className="flex-1 font-medium">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <span className="text-emerald-400 text-sm">✓</span>
          <span className="flex-1 font-medium">{successMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* GOOGLE OAUTH SECTION */}
      {/* ======================================================== */}
      {(mode === 'login' || mode === 'signup') && (
        <div className="space-y-3 mb-4">
          <button
            type="button"
            onClick={() => setShowGoogleChooser(!showGoogleChooser)}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-[#333333] bg-[#212121] hover:bg-[#282828] text-white text-sm font-medium transition-colors cursor-pointer active:scale-[0.99]"
          >
            <GoogleIcon className="w-4 h-4 flex-shrink-0" />
            <span>Continue with Google</span>
          </button>

          {/* Compact Google Account Chooser */}
          {showGoogleChooser && (
            <div className="rounded-xl border border-[#333333] bg-[#141414] p-2.5 space-y-1.5 animate-in fade-in duration-150">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                Choose an account
              </div>
              {sampleGoogleAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleGoogleLogin(acc)}
                  disabled={loading}
                  className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-7 h-7 rounded-full object-cover border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{acc.name}</div>
                    <div className="text-[11px] text-gray-400 truncate">{acc.email}</div>
                  </div>
                  <span className="text-[9px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                    {acc.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Subtle Compact Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#2e2e2e] w-full" />
            <span className="bg-[#181818] px-2.5 text-[11px] text-gray-500 font-medium tracking-wider absolute">
              OR
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FORM INPUTS */}
      {/* ======================================================== */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Display Name (Sign Up only) */}
        {mode === 'signup' && (
          <div>
            <label className="text-xs font-medium text-gray-300 mb-1.5 block">
              Display name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Divya Gadwal"
              className="w-full h-11 px-3.5 rounded-xl bg-[#212121] border border-[#333333] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white focus:ring-0 transition-colors"
            />
          </div>
        )}

        {/* Email Address */}
        {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
          <div>
            <label className="text-xs font-medium text-gray-300 mb-1.5 block">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full h-11 px-3.5 rounded-xl bg-[#212121] border border-[#333333] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white focus:ring-0 transition-colors"
            />
          </div>
        )}

        {/* Password Field with Eye Toggle */}
        {(mode === 'login' || mode === 'signup') && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-300">
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
                className="w-full h-11 px-3.5 pr-11 rounded-xl bg-[#212121] border border-[#333333] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white focus:ring-0 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Reset Password Step 2 */}
        {mode === 'reset-password' && (
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-gray-300 mb-1.5 block">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Enter reset token"
                className="w-full h-11 px-3.5 rounded-xl bg-[#212121] border border-[#333333] text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-white focus:ring-0 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-300 mb-1.5 block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-11 px-3.5 pr-11 rounded-xl bg-[#212121] border border-[#333333] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white focus:ring-0 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
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
          className="w-full h-11 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition-colors cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
        >
          {loading && (
            <svg className="animate-spin w-4 h-4 text-black" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          <span>
            {loading
              ? 'Please wait...'
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

      {/* Mode Switchers */}
      <div className="mt-5 pt-3.5 border-t border-[#2e2e2e] text-center text-xs">
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
            <span>Back to log in</span>
          </button>
        )}
      </div>

      {/* Terms Notice */}
      <div className="mt-4 text-[11px] text-gray-500 text-center leading-normal">
        By continuing, you agree to ChatGPT's{' '}
        <span className="text-gray-400 hover:text-white cursor-pointer underline">Terms</span> and{' '}
        <span className="text-gray-400 hover:text-white cursor-pointer underline">Privacy Policy</span>.
      </div>
    </div>
  );

  // If used inside a modal, return the 400px card directly
  if (isModal) {
    return cardContent;
  }

  // If used as a standalone page route (/login), center the 400px card in the dark viewport
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0d0d] p-4 font-sans selection:bg-neutral-800 selection:text-white">
      {cardContent}
    </div>
  );
}
