"use client";

import React, { useEffect, useState } from 'react';
import { Settings, User, X } from 'lucide-react';
import AccountSettingsForm from './account-settings-form';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'account';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Handle escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'account', label: 'Account', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-[#0D0D0D] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#0D0D0D]">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-gray-800 bg-[#111111] overflow-y-auto">
            <div className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#0D0D0D]">
            {activeTab === 'account' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Account Settings</h3>
                  <p className="text-gray-400">
                    Manage your account information and preferences.
                  </p>
                </div>
                <div className="bg-[#111111] rounded-xl border border-gray-800 p-6">
                    <AccountSettingsForm />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
