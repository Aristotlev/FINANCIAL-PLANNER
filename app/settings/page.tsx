/**
 * Settings Page
 * User settings, account management, and pricing
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Settings, User } from 'lucide-react';
import AccountSettingsForm from '@/components/settings/account-settings-form';

type SettingsTab = 'account';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'account') {
      setActiveTab('account');
    }
  }, [searchParams]);

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'account', label: 'Account', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">
              Settings
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Manage your account, subscription, and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden">
          <div className="border-b border-gray-800">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm
                    transition-all duration-200 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                <p className="text-gray-400">
                  Manage your account information and profile.
                </p>
                <div className="max-w-2xl text-gray-300">
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
