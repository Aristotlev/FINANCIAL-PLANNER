'use client';

import { useBetterAuth } from '@/contexts/better-auth-context';
import { useEffect, useState } from 'react';

export default function TestAuthPage() {
  const { user, isLoading } = useBetterAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const fetchData = () => {
    // Fetch profile picture endpoint
    fetch('/api/auth/profile-picture')
      .then(res => res.json())
      .then(data => {
        console.log('Profile data:', data);
        setProfileData(data);
      })
      .catch(err => console.error('Error:', err));

    // Fetch session endpoint
    fetch('/api/auth/get-session')
      .then(res => res.json())
      .then(data => {
        console.log('Session data:', data);
        setSessionData(data);
      })
      .catch(err => console.error('Error:', err));

    // Fetch debug endpoint
    fetch('/api/auth/debug-session')
      .then(res => res.json())
      .then(data => {
        console.log('Debug data:', data);
        setDebugData(data);
      })
      .catch(err => console.error('Error:', err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncProfile = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/auth/sync-profile', {
        method: 'POST',
      });
      const data = await response.json();
      setSyncResult(data);
      console.log('Sync result:', data);
      
      // Refresh all data
      setTimeout(() => {
        fetchData();
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({ error: 'Failed to sync' });
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Not authenticated</h1>
        <p>Please sign in with Google to test profile picture.</p>
        <a href="/" className="text-blue-600 hover:underline">Go to login page</a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>
      
      {/* Sync Button */}
      <div className="mb-6">
        <button
          onClick={syncProfile}
          disabled={syncing}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {syncing ? '⏳ Syncing...' : '🔄 Sync Profile Picture from Google'}
        </button>
        {syncResult && (
          <div className={`mt-4 p-4 rounded-lg ${syncResult.error ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
            <pre className="text-sm overflow-auto">{JSON.stringify(syncResult, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* User Context Data */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Context Data</h2>
          <div className="mb-4 flex items-center gap-4">
            {user.avatarUrl ? (
              <>
                <img 
                  src={user.avatarUrl} 
                  alt={user.name}
                  className="w-24 h-24 rounded-full border-4 border-blue-500"
                  onError={(e) => {
                    console.error('Image failed to load:', user.avatarUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div>
                  <p className="text-green-600 font-semibold">✅ Avatar URL found!</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{user.avatarUrl}</p>
                </div>
              </>
            ) : (
              <div>
                <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center mb-2">
                  <span className="text-2xl">👤</span>
                </div>
                <p className="text-red-600 font-semibold">❌ No avatar URL in context</p>
              </div>
            )}
          </div>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        {/* Debug Session Data */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Session API</h2>
          {debugData ? (
            <>
              {debugData.session?.user?.image ? (
                <div className="mb-4">
                  <p className="text-green-600 font-semibold mb-2">✅ Image found in session!</p>
                  <img 
                    src={debugData.session.user.image} 
                    alt="Profile from session"
                    className="w-24 h-24 rounded-full border-4 border-green-500"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 break-all">{debugData.session.user.image}</p>
                </div>
              ) : (
                <p className="text-red-600 font-semibold mb-4">❌ No image in session data</p>
              )}
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        {/* Profile Picture API Response */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Profile Picture API</h2>
          {profileData ? (
            <>
              {profileData.user?.image && (
                <div className="mb-4">
                  <img 
                    src={profileData.user.image} 
                    alt="Profile from API"
                    className="w-24 h-24 rounded-full border-4 border-purple-500"
                  />
                </div>
              )}
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        {/* Session API Response */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Session API</h2>
          {sessionData ? (
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
