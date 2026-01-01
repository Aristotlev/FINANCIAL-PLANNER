"use client";

import React, { useState, useEffect } from 'react';
import { useBetterAuth } from '@/contexts/better-auth-context';
import { authClient } from '@/lib/auth-client';
import { User, Save, Loader2, Upload, Camera, Shield, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';

export default function AccountSettingsForm() {
  const { user } = useBetterAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [securityKey, setSecurityKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setImage(user.avatarUrl || '');
      fetchSecurityKey();
    }
  }, [user]);

  const fetchSecurityKey = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/user/security-key');
      if (response.ok) {
        const data = await response.json();
        if (data.securityKey) {
          setSecurityKey(data.securityKey);
        }
      }
    } catch (error) {
      console.error('Error fetching security key:', error);
    }
  };

  const handleCopyKey = () => {
    if (securityKey) {
      navigator.clipboard.writeText(securityKey);
      setHasCopiedKey(true);
      setTimeout(() => setHasCopiedKey(false), 2000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file.' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setImage(data.url);
      setMessage({ type: 'success', text: 'Image uploaded successfully! Click Save to apply changes.' });
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload image' });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await (authClient as any).user.update({
        name,
        image,
        bio, // This will be handled by additionalFields configuration
      });
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Refresh the page or context to show new data might be needed, 
      // but better-auth usually updates session automatically or we might need to trigger a re-fetch.
      // For now, let's assume the user sees the success message.
      // A reload might be needed to see the new avatar in the header if it's cached.
      setTimeout(() => {
         window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Profile Picture
          </label>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 relative">
                {image ? (
                  <img src={image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-12 h-12" />
                  </div>
                )}
                
                {/* Overlay for upload */}
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload New Picture
                    </>
                  )}
                </button>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  JPG, GIF or PNG. Max size of 5MB.
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                    OR
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={image?.startsWith('/api/auth/avatar') ? '' : image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username / Display Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Your name"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Tell us a little about yourself..."
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Brief description for your profile.
          </p>
        </div>

        {/* Security Key Section */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-white/90">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="font-medium text-sm">Security Key</h3>
          </div>
          
          {securityKey ? (
            <div className="relative">
              <div className={`
                w-full px-3 py-2 pr-24 bg-black/40 border border-white/10 rounded-md 
                font-mono text-sm text-emerald-400 break-all
                ${!showKey ? 'blur-sm select-none' : 'select-all'}
              `}>
                {showKey ? securityKey : '•'.repeat(24)}
              </div>
              
              <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1 bg-zinc-900/80 pl-2 rounded-r-md">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-colors"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {hasCopiedKey ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              No security key found. Please refresh the page to generate one.
            </div>
          )}
          
          <p className="text-xs text-white/40">
            This is your unique security key. Keep it safe.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
