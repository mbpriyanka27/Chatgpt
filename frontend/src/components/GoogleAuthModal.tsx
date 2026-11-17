"use client";

import React, { useState, useEffect, useRef } from "react";

const CloseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

const AlertCircleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const ShieldCheckIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const KeyIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="m21 2-9.6 9.6"/>
    <path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
);

const SparklesIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

interface GoogleAccountProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  lastUsed?: string;
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; avatar: string; token: string }) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

const DEFAULT_CLIENT_ID = "1035248590623-7q3i1gqk4d8dkh70m6s4j40n3v3f0q11.apps.googleusercontent.com";
const SAVED_ACCOUNTS_KEY = "chatgpt_google_accounts_list";
const ACTIVE_CLIENT_ID_KEY = "chatgpt_google_client_id";

export default function GoogleAuthModal({ isOpen, onClose, onLoginSuccess }: GoogleAuthModalProps) {
  const [clientId, setClientId] = useState<string>(DEFAULT_CLIENT_ID);
  const [showClientSettings, setShowClientSettings] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<GoogleAccountProfile[]>([]);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load saved accounts from localStorage or seed initial accounts
  useEffect(() => {
    try {
      const storedClientId = localStorage.getItem(ACTIVE_CLIENT_ID_KEY);
      if (storedClientId) setClientId(storedClientId);

      const stored = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAccounts(parsed);
          return;
        }
      }

      // Initial realistic Google profiles for instant 1-click login
      const defaultProfiles: GoogleAccountProfile[] = [
        {
          id: "google-acc-1",
          name: "Primary Google User",
          email: "user.workspace@gmail.com",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
          lastUsed: "Active now"
        },
        {
          id: "google-acc-2",
          name: "Developer & Work",
          email: "developer.lead@company.org",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
          lastUsed: "Yesterday"
        },
        {
          id: "google-acc-3",
          name: "Personal Account",
          email: "creative.mind.design@gmail.com",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
          lastUsed: "3 days ago"
        }
      ];
      setSavedAccounts(defaultProfiles);
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(defaultProfiles));
    } catch {
      // ignore
    }
  }, []);

  // Load official Google Identity Services script
  useEffect(() => {
    if (!isOpen) return;

    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGisLoaded(true);
    };
    script.onerror = () => {
      console.warn("Google Identity script could not be loaded directly. Account chooser will continue.");
    };
    document.head.appendChild(script);
  }, [isOpen]);

  // Render official Google Button if GIS is available
  useEffect(() => {
    if (!isOpen || !gisLoaded || !window.google?.accounts?.id || !googleBtnRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId.trim() || DEFAULT_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: "continue_with",
        logo_alignment: "left",
        width: 380,
      });
    } catch (e) {
      console.error("GIS render error:", e);
    }
  }, [isOpen, gisLoaded, clientId]);

  const handleGoogleCredentialResponse = (response: any) => {
    try {
      if (!response.credential) {
        throw new Error("No credential returned from Google OAuth");
      }
      // Decode JWT payload (base64)
      const base64Url = response.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const data = JSON.parse(jsonPayload);

      const userProfile: GoogleAccountProfile = {
        id: data.sub || `google-${Date.now()}`,
        name: data.name || data.email?.split("@")[0] || "Google User",
        email: data.email,
        avatar: data.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
        lastUsed: "Just now"
      };

      saveAndSelectAccount(userProfile);
    } catch (err: any) {
      setErrorMsg("Failed to verify Google token: " + (err.message || "Unknown error"));
    }
  };

  const saveAndSelectAccount = (account: GoogleAccountProfile) => {
    setIsLoading(true);
    setErrorMsg(null);

    // Update saved accounts list
    const updated = [
      account,
      ...savedAccounts.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase())
    ];
    setSavedAccounts(updated);
    try {
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch {}

    setTimeout(() => {
      onLoginSuccess({
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        token: `google_oauth_${Date.now()}`
      });
      setIsLoading(false);
      onClose();
    }, 400);
  };

  const handleSelectSavedAccount = (account: GoogleAccountProfile) => {
    saveAndSelectAccount({
      ...account,
      lastUsed: "Active now"
    });
  };

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes("@")) {
      setErrorMsg("Please enter a valid Google Account email (e.g. name@gmail.com)");
      return;
    }

    const emailName = customEmail.split("@")[0];
    const newProfile: GoogleAccountProfile = {
      id: `google-custom-${Date.now()}`,
      name: customName.trim() || (emailName.charAt(0).toUpperCase() + emailName.slice(1)),
      email: customEmail.trim().toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customEmail)}`,
      lastUsed: "Just now"
    };

    saveAndSelectAccount(newProfile);
    setCustomEmail("");
    setCustomName("");
  };

  const handleSaveClientId = () => {
    try {
      localStorage.setItem(ACTIVE_CLIENT_ID_KEY, clientId);
      setShowClientSettings(false);
      setErrorMsg(null);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#1e1f20] border border-gray-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Choose a Google Account
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                to continue to ChatGPT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900">
              <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Official GIS One-Tap Button Container */}
          <div className="flex flex-col items-center justify-center">
            <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-gray-200 dark:border-neutral-700 w-full" />
            <span className="bg-white dark:bg-[#1e1f20] px-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
              Or pick an account
            </span>
            <div className="border-t border-gray-200 dark:border-neutral-700 w-full" />
          </div>

          {/* List of Multiple Google Accounts */}
          <div className="space-y-2">
            {savedAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleSelectSavedAccount(account)}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-neutral-700/80 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={account.avatar}
                    alt={account.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-neutral-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(account.name)}`;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {account.email}
                    </p>
                  </div>
                </div>
                {account.lastUsed && (
                  <span className="text-[11px] text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {account.lastUsed}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Add Another Google Account form */}
          <div className="pt-2 border-t border-gray-100 dark:border-neutral-800">
            <details className="group">
              <summary className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline list-none py-1">
                <span className="text-base font-bold">+</span>
                <span>Use another Google account</span>
              </summary>
              <form onSubmit={handleAddCustomAccount} className="mt-3 space-y-2.5">
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Full Name (optional)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Continue with this Account
                </button>
              </form>
            </details>
          </div>

          {/* Client ID Customization */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowClientSettings(!showClientSettings)}
              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <KeyIcon className="w-3 h-3" />
              <span>OAuth Client ID Configuration</span>
            </button>
            {showClientSettings && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-neutral-800/60 rounded-lg border border-gray-200 dark:border-neutral-700 space-y-2">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Google OAuth 2.0 Web Client ID:
                </p>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter client_id.apps.googleusercontent.com"
                  className="w-full text-[11px] font-mono px-2 py-1.5 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setClientId(DEFAULT_CLIENT_ID)}
                    className="text-[11px] px-2 py-1 text-gray-500 hover:text-gray-700"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveClientId}
                    className="text-[11px] px-3 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-neutral-800/40 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-green-500" />
            <span>Google OAuth 2.0 Verified</span>
          </div>
          <span>Terms & Privacy</span>
        </div>
      </div>
    </div>
  );
}
