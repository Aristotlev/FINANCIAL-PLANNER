"use client";

import { useEffect, useState } from 'react';
import { useBetterAuth } from '@/contexts/better-auth-context';

export default function AvatarTestPage() {
  const { user } = useBetterAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [imageLoadStatus, setImageLoadStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  useEffect(() => {
    if (user) {
      addLog(`User data: ${JSON.stringify(user, null, 2)}`);
      addLog(`Avatar URL: ${user.avatarUrl}`);
    } else {
      addLog('No user data available');
    }
  }, [user]);

  const testDirectFetch = async () => {
    try {
      addLog('Testing direct fetch to /api/auth/avatar...');
      const response = await fetch('/api/auth/avatar');
      addLog(`Response status: ${response.status} ${response.statusText}`);
      addLog(`Content-Type: ${response.headers.get('content-type')}`);
      addLog(`Cache-Control: ${response.headers.get('cache-control')}`);
      
      if (response.ok) {
        const blob = await response.blob();
        addLog(`Response size: ${blob.size} bytes`);
        addLog(`Blob type: ${blob.type}`);
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Avatar Debug Page</h1>
        
        {/* Avatar Display Tests */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Avatar Display Tests</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Test 1: Using user.avatarUrl */}
            <div className="text-center">
              <h3 className="text-sm font-medium mb-3">Using user.avatarUrl</h3>
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-blue-500 bg-gray-700">
                {user?.avatarUrl && (
                  <img 
                    src={user.avatarUrl} 
                    alt="Avatar 1"
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      setImageLoadStatus('success');
                      addLog('✅ Image loaded successfully (user.avatarUrl)');
                    }}
                    onError={(e) => {
                      setImageLoadStatus('error');
                      addLog('❌ Image failed to load (user.avatarUrl)');
                    }}
                  />
                )}
              </div>
              <p className="text-xs mt-2 text-gray-400 break-all">{user?.avatarUrl || 'No URL'}</p>
            </div>

            {/* Test 2: Direct endpoint */}
            <div className="text-center">
              <h3 className="text-sm font-medium mb-3">Direct /api/auth/avatar</h3>
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-green-500 bg-gray-700">
                <img 
                  src="/api/auth/avatar" 
                  alt="Avatar 2"
                  className="w-full h-full object-cover"
                  onLoad={() => addLog('✅ Image loaded (direct endpoint)')}
                  onError={() => addLog('❌ Image failed (direct endpoint)')}
                />
              </div>
              <p className="text-xs mt-2 text-gray-400">/api/auth/avatar</p>
            </div>

            {/* Test 3: With timestamp */}
            <div className="text-center">
              <h3 className="text-sm font-medium mb-3">With Timestamp</h3>
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-purple-500 bg-gray-700">
                <img 
                  src={`/api/auth/avatar?t=${Date.now()}`}
                  alt="Avatar 3"
                  className="w-full h-full object-cover"
                  onLoad={() => addLog('✅ Image loaded (with timestamp)')}
                  onError={() => addLog('❌ Image failed (with timestamp)')}
                />
              </div>
              <p className="text-xs mt-2 text-gray-400">?t={Date.now()}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={`px-3 py-1 rounded text-sm ${
              imageLoadStatus === 'success' ? 'bg-green-600' :
              imageLoadStatus === 'error' ? 'bg-red-600' :
              'bg-yellow-600'
            }`}>
              Status: {imageLoadStatus}
            </span>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          {user ? (
            <div className="space-y-2 font-mono text-sm">
              <div><span className="text-gray-400">ID:</span> {user.id}</div>
              <div><span className="text-gray-400">Email:</span> {user.email}</div>
              <div><span className="text-gray-400">Name:</span> {user.name}</div>
              <div><span className="text-gray-400">Avatar URL:</span> 
                <div className="ml-4 break-all bg-gray-900 p-2 rounded mt-1">
                  {user.avatarUrl}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Not authenticated</p>
          )}
        </div>

        {/* Test Button */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manual Tests</h2>
          <button
            onClick={testDirectFetch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Test Direct Fetch to /api/auth/avatar
          </button>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Console Logs</h2>
          <div className="bg-gray-900 rounded p-4 font-mono text-xs space-y-1 max-h-96 overflow-auto">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="text-green-400">{log}</div>
              ))
            ) : (
              <div className="text-gray-500">No logs yet...</div>
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-3 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition"
          >
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  );
}
