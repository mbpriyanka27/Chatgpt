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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-[440px] my-auto">
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
