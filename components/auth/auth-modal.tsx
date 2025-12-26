"use client";

import React from 'react';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
          {mode === 'login' ? (
            <LoginForm
              onClose={onClose}
              onSwitchToSignup={() => onSwitchMode('signup')}
            />
          ) : (
            <SignupForm
              onClose={onClose}
              onSwitchToLogin={() => onSwitchMode('login')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
