import React, { useState, useEffect } from 'react';
import { CloseIcon, GoogleIcon } from './Icons';

interface GoogleAccount {
  name: string;
  email: string;
  avatar: string;
  bg?: string;
  photoUrl?: string;
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  apiUrl: string;
}

const DEFAULT_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'Divya Gadwal',
    email: 'divya.gadwal@gmail.com',
    avatar: 'D',
    bg: '#ea580c'
  },
  {
    name: 'Yashwanth V S',
    email: 'yashwanth.vs@gmail.com',
    avatar: 'Y',
    bg: '#2563eb'
  }
];

export function GoogleAuthModal({ isOpen, onClose, onSuccess, apiUrl }: GoogleAuthModalProps) {
  const [view, setView] = useState<'google_list' | 'google_add' | 'email_auth'>('google_list');
  const [emailAuthMode, setEmailAuthMode] = useState<'login' | 'register'>('login');

  // All Google Accounts (loaded from localStorage + defaults)
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  
  // Real-time input states for new Google account
  const [newGoogleEmail, setNewGoogleEmail] = useState('');
  const [newGoogleName, setNewGoogleName] = useState('');

  // Email Sign In / Register states
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailDisplayName, setEmailDisplayName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load all Google accounts from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chatgpt_saved_google_accounts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGoogleAccounts(parsed);
            return;
          }
        }
      } catch (e) {}
    }
    setGoogleAccounts(DEFAULT_ACCOUNTS);
  }, [isOpen]);

  if (!isOpen) return null;

  const saveGoogleAccount = (acc: GoogleAccount) => {
    try {
      const existing = googleAccounts.filter(a => a.email.toLowerCase() !== acc.email.toLowerCase());
      const updated = [acc, ...existing];
      setGoogleAccounts(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chatgpt_saved_google_accounts', JSON.stringify(updated));
      }
    } catch (e) {}
  };

  // Google Sign-In with an account
  const handleGoogleSignIn = async (accountEmail: string, accountName?: string) => {
    setLoading(true);
    setError('');

    try {
      const cleanEmail = accountEmail.trim().toLowerCase();
      const finalName = accountName?.trim() || cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
      const avatarChar = finalName.charAt(0).toUpperCase();
      const photoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalName)}&backgroundColor=0284c7,ea580c,16a34a,7c3aed`;

      const res = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          display_name: finalName,
          photo_url: photoUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Google sign-in failed');

      // Save to known accounts list
      saveGoogleAccount({
        name: data.user.display_name || finalName,
        email: data.user.email || cleanEmail,
        avatar: avatarChar,
        photoUrl: data.user.photo_url || photoUrl
      });

      localStorage.setItem('chatgpt_token', data.access_token);
      localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
      localStorage.removeItem('chatgpt_logged_out');
      onSuccess(data.access_token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in encountered an issue.');
    } finally {
      setLoading(false);
    }
  };

  // Handle direct Email Sign In / Registration
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = emailAuthMode === 'login' ? `${apiUrl}/api/auth/login` : `${apiUrl}/api/auth/register`;
      const payload: any = {
        email: emailAddress.trim().toLowerCase(),
        password: emailPassword
      };
      if (emailAuthMode === 'register') {
        payload.display_name = emailDisplayName.trim() || emailAddress.split('@')[0];
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `${emailAuthMode === 'login' ? 'Login' : 'Registration'} failed`);

      localStorage.setItem('chatgpt_token', data.access_token);
      localStorage.setItem('chatgpt_user', JSON.stringify(data.user));
      localStorage.removeItem('chatgpt_logged_out');
      onSuccess(data.access_token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Email authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          border: '1px solid #dadce0',
          padding: '32px',
          color: '#202124',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '6px',
            borderRadius: '50%',
            color: '#5f6368',
            backgroundColor: '#f1f3f4',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Close"
        >
          <CloseIcon className="w-4 h-4" />
        </button>

        {/* Google / Auth Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            <svg style={{ width: '38px', height: '38px' }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202124', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
            {view === 'email_auth'
              ? (emailAuthMode === 'login' ? 'Sign in with Email' : 'Create an Account')
              : 'Choose a Google Account'}
          </h2>
          <p style={{ fontSize: '13px', color: '#5f6368', margin: 0 }}>
            to continue to <strong style={{ color: '#202124' }}>ChatGPT Cloud Pro</strong>
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* View 1: List of all saved Google Accounts */}
        {view === 'google_list' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', maxHeight: '240px', overflowY: 'auto' }}>
              {googleAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGoogleSignIn(acc.email, acc.name)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: '1px solid #dadce0',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafd')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  {acc.photoUrl ? (
                    <img
                      src={acc.photoUrl}
                      alt={acc.name}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: acc.bg || '#ea580c',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '15px',
                        flexShrink: 0
                      }}
                    >
                      {acc.avatar}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.email}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#1a73e8', fontWeight: 600 }}>
                    Sign In →
                  </span>
                </button>
              ))}
            </div>

            {/* Add / Use Another Google Account Button */}
            <button
              onClick={() => { setView('google_add'); setError(''); }}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '16px',
                border: '1px dashed #1a73e8',
                backgroundColor: '#f8fafd',
                color: '#1a73e8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>+</span>
              <span>Use another Google account</span>
            </button>

            {/* Email Sign In / Register Button */}
            <div style={{ borderTop: '1px solid #f1f3f4', paddingTop: '12px', marginTop: '12px' }}>
              <button
                onClick={() => { setView('email_auth'); setError(''); }}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '24px',
                  border: '1px solid #dadce0',
                  backgroundColor: '#ffffff',
                  color: '#3c4043',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(60,64,67,0.08)'
                }}
              >
                <span>✉️</span>
                <span>Email Sign In / Register</span>
              </button>
            </div>
          </div>
        )}

        {/* View 2: Add Another Google Account */}
        {view === 'google_add' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGoogleSignIn(newGoogleEmail, newGoogleName);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '6px' }}>
                Google Email Address
              </label>
              <input
                type="email"
                required
                value={newGoogleEmail}
                onChange={(e) => setNewGoogleEmail(e.target.value)}
                placeholder="name@gmail.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1px solid #dadce0',
                  outline: 'none',
                  color: '#202124',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '6px' }}>
                Your Name
              </label>
              <input
                type="text"
                value={newGoogleName}
                onChange={(e) => setNewGoogleName(e.target.value)}
                placeholder="e.g. Yashwanth or Divya"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1px solid #dadce0',
                  outline: 'none',
                  color: '#202124',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newGoogleEmail.includes('@')}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '24px',
                backgroundColor: loading || !newGoogleEmail.includes('@') ? '#dadce0' : '#1a73e8',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: loading || !newGoogleEmail.includes('@') ? 'not-allowed' : 'pointer',
                marginTop: '4px'
              }}
            >
              {loading ? 'Authenticating with Google...' : 'Sign in with this Google Account'}
            </button>

            <button
              type="button"
              onClick={() => { setView('google_list'); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#1a73e8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ← Back to accounts list
            </button>
          </form>
        )}

        {/* View 3: Email Sign In & Register Form */}
        {view === 'email_auth' && (
          <form onSubmit={handleEmailAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid #dadce0', marginBottom: '4px' }}>
              <button
                type="button"
                onClick={() => { setEmailAuthMode('login'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: emailAuthMode === 'login' ? '#1a73e8' : '#5f6368',
                  borderBottom: emailAuthMode === 'login' ? '2px solid #1a73e8' : 'none',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setEmailAuthMode('register'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: emailAuthMode === 'register' ? '#1a73e8' : '#5f6368',
                  borderBottom: emailAuthMode === 'register' ? '2px solid #1a73e8' : 'none',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer'
                }}
              >
                Register
              </button>
            </div>

            {emailAuthMode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={emailDisplayName}
                  onChange={(e) => setEmailDisplayName(e.target.value)}
                  placeholder="Your Name"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    border: '1px solid #dadce0',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1px solid #dadce0',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1px solid #dadce0',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !emailAddress.includes('@')}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '24px',
                backgroundColor: loading ? '#dadce0' : '#111827',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px'
              }}
            >
              {loading ? 'Please wait...' : emailAuthMode === 'login' ? 'Sign In with Email' : 'Register Account'}
            </button>

            <button
              type="button"
              onClick={() => { setView('google_list'); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#1a73e8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ← Back to Google Accounts
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f3f4', fontSize: '11px', color: '#70757a', textAlign: 'center' }}>
          To continue, Google will share your email, name, and profile picture with ChatGPT.
        </div>
      </div>
    </div>
  );
}
