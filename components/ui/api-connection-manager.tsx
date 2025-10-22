"use client";

import React, { useState } from 'react';
import { Modal } from './modal';
import { useAPIConnection } from '../../contexts/api-connection-context';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Bitcoin,
  TrendingUp,
  Newspaper,
  Bot,
  BarChart3
} from 'lucide-react';

interface APIConnectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_SERVICE_CONFIG = [
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Stock market data and news',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'crypto',
    name: 'Crypto APIs',
    description: 'Cryptocurrency prices and data',
    icon: Bitcoin,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    description: 'Stock quotes and financial data',
    icon: BarChart3,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'news',
    name: 'News API',
    description: 'Financial news and headlines',
    icon: Newspaper,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'gemini',
    name: 'Gemini AI',
    description: 'AI-powered financial insights',
    icon: Bot,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    id: 'market-data',
    name: 'Market Data',
    description: 'Real-time market information',
    icon: BarChart3,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
];

export function APIConnectionManager({ isOpen, onClose }: APIConnectionManagerProps) {
  const { connections, checkConnection, saveApiKey } = useAPIConnection();
  const [editingService, setEditingService] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState<string | null>(null);

  const handleSaveApiKey = (serviceId: string) => {
    if (apiKeyInput.trim()) {
      saveApiKey(serviceId, apiKeyInput.trim());
      setApiKeyInput('');
      setEditingService(null);
    }
  };

  const handleCheckConnection = async (serviceId: string) => {
    setChecking(serviceId);
    await checkConnection(serviceId);
    setTimeout(() => setChecking(null), 1000);
  };

  const toggleShowApiKey = (serviceId: string) => {
    setShowApiKey(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Connection Manager" maxWidth="max-w-4xl">
      <div className="p-6">
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Manage your API connections and keys for various financial data services.
          </p>
        </div>

        <div className="space-y-4">
          {API_SERVICE_CONFIG.map(service => {
            const connection = connections[service.id];
            const Icon = service.icon;
            const isEditing = editingService === service.id;
            const isChecking = checking === service.id;

            return (
              <div
                key={service.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  {/* Service Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${service.bgColor}`}>
                      <Icon className={`w-6 h-6 ${service.color}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {service.name}
                        </h3>
                        
                        {/* Status Badge */}
                        {connection?.status === 'connected' ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                            <Wifi className="w-3 h-3" />
                            Connected
                          </span>
                        ) : connection?.status === 'error' ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Error
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 text-xs font-medium rounded-full">
                            <WifiOff className="w-3 h-3" />
                            Not Connected
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {service.description}
                      </p>

                      {/* API Key Management */}
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type={showApiKey[service.id] ? 'text' : 'password'}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder="Enter API key..."
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                          <button
                            onClick={() => toggleShowApiKey(service.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {showApiKey[service.id] ? (
                              <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleSaveApiKey(service.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingService(null);
                              setApiKeyInput('');
                            }}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : connection?.apiKey ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <code className="text-sm text-gray-600 dark:text-gray-400">
                              {showApiKey[service.id] 
                                ? connection.apiKey 
                                : '••••••••••••••••'}
                            </code>
                          </div>
                          <button
                            onClick={() => toggleShowApiKey(service.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {showApiKey[service.id] ? (
                              <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                          No API key configured
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleCheckConnection(service.id)}
                      disabled={isChecking}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Test connection"
                    >
                      <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isChecking ? 'animate-spin' : ''}`} />
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingService(service.id);
                        setApiKeyInput(connection?.apiKey || '');
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit API key"
                    >
                      <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Last Checked */}
                {connection?.lastChecked && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Last checked: {connection.lastChecked.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 Getting API Keys
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• <strong>Finnhub:</strong> Sign up at <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" className="underline">finnhub.io</a></li>
            <li>• <strong>News API:</strong> Get your key at <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="underline">newsapi.org</a></li>
            <li>• <strong>Gemini AI:</strong> Create API key at <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="underline">ai.google.dev</a></li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
