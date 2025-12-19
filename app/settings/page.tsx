/**
 * Settings Page
 * User settings, account management, and pricing
 */

"use client";

import React, { useState } from 'react';
import { Settings, CreditCard, User, Bell, Shield, Palette, Database } from 'lucide-react';
import PricingSection from '@/components/pricing/pricing-section';
import SubscriptionDashboard from '@/components/pricing/subscription-dashboard';

type SettingsTab = 'account' | 'subscription' | 'pricing' | 'notifications' | 'security' | 'appearance' | 'data';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('pricing');

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'account', label: 'Account', icon: <User className="w-5 h-5" /> },
    { id: 'subscription', label: 'Subscription', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'pricing', label: 'Pricing Plans', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-5 h-5" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-5 h-5" /> },
    { id: 'data', label: 'Data & Privacy', icon: <Database className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Manage your account, subscription, and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm
                    transition-all duration-200 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your account information and profile.
                </p>
                {/* Add account settings here */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    Account settings coming soon...
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Subscription</h2>
                <SubscriptionDashboard />
              </div>
            )}

            {activeTab === 'pricing' && (
              <div>
                <PricingSection />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Customize how and when you receive notifications.
                </p>
                {/* Add notification settings here */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    Notification settings coming soon...
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your password, 2FA, and security preferences.
                </p>
                {/* Add security settings here */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    Security settings coming soon...
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appearance</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Customize the look and feel of your app.
                </p>
                {/* Add appearance settings here */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    Appearance settings coming soon...
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data & Privacy</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your data, privacy settings, and export options.
                </p>
                {/* Add data & privacy settings here */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    Data & privacy settings coming soon...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
