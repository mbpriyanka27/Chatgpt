'use client';

import React from 'react';
import LoginPage from './LoginPage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
  onOpenGoogleAuth?: () => void;
  apiUrl?: string;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-[400px] mx-auto my-auto relative">
        <LoginPage
          isModal={true}
          onSuccess={(token, user) => {
            onLoginSuccess(token, user);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

export default AuthModal;
