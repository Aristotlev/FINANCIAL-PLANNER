"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface APIConnection {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked?: Date;
  apiKey?: string;
}

interface APIConnectionContextType {
  connections: Record<string, APIConnection>;
  updateConnection: (name: string, connection: Partial<APIConnection>) => void;
  checkConnection: (name: string) => Promise<void>;
  saveApiKey: (name: string, apiKey: string) => void;
}

const APIConnectionContext = createContext<APIConnectionContextType | undefined>(undefined);

const API_SERVICES = [
  'finnhub',
  'crypto',
  'yahoo-finance',
  'news',
  'gemini',
  'market-data',
];

export function APIConnectionProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<Record<string, APIConnection>>({});

  // Load saved API keys and connection status from localStorage
  useEffect(() => {
    const savedConnections: Record<string, APIConnection> = {};
    
    API_SERVICES.forEach(service => {
      const apiKey = localStorage.getItem(`apiKey_${service}`);
      savedConnections[service] = {
        name: service,
        status: apiKey ? 'connected' : 'disconnected',
        apiKey: apiKey || undefined,
      };
    });
    
    setConnections(savedConnections);
  }, []);

  const updateConnection = (name: string, connection: Partial<APIConnection>) => {
    setConnections(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        name,
        ...connection,
      },
    }));
  };

  const checkConnection = async (name: string) => {
    updateConnection(name, { status: 'connected', lastChecked: new Date() });
    
    // You can implement actual API health checks here
    // For now, we just mark it as checked
  };

  const saveApiKey = (name: string, apiKey: string) => {
    localStorage.setItem(`apiKey_${name}`, apiKey);
    updateConnection(name, { 
      status: 'connected', 
      apiKey,
      lastChecked: new Date() 
    });
  };

  return (
    <APIConnectionContext.Provider value={{ connections, updateConnection, checkConnection, saveApiKey }}>
      {children}
    </APIConnectionContext.Provider>
  );
}

export function useAPIConnection() {
  const context = useContext(APIConnectionContext);
  if (context === undefined) {
    throw new Error('useAPIConnection must be used within an APIConnectionProvider');
  }
  return context;
}
