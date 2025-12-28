"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { SupabaseDataService } from '@/lib/supabase/supabase-data-service';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (callbackURL?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const BetterAuthContext = createContext<AuthContextType | undefined>(undefined);

export function BetterAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('Session check timeout - setting loading to false');
        setIsLoading(false);
        setError('Session check timed out');
      }
    }, 10000); // 10 second timeout

    checkSession();

    return () => clearTimeout(timeout);
  }, []);

  const checkSession = async () => {
    try {
      setError(null);
      const response = await authClient.getSession();
      console.log('🔍 Raw session response:', response);
      
      if (response.data && 'user' in response.data && response.data.user) {
        const sessionData = response.data;
        
        console.log('✅ Session user data:', {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name,
          image: sessionData.user.image,
          createdAt: sessionData.user.createdAt,
          updatedAt: sessionData.user.updatedAt,
        });
        
        // Always use the avatar proxy endpoint with cache busting - it handles all cases:
        // - Proxies Google images (avoids CORS)
        // - Returns initials SVG if no image
        // - Returns default icon if not authenticated
        // Add timestamp to force reload and avoid browser cache
        const avatarUrl = `/api/auth/avatar?t=${Date.now()}`;
        console.log('📸 Using avatar endpoint with cache bust:', avatarUrl);
        console.log('📸 Image from session:', sessionData.user.image);
        
        setUser({
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name || 'User',
          avatarUrl: avatarUrl,
          bio: (sessionData.user as any).bio,
        });
      } else {
        console.log('❌ No valid session data:', response);
      }
    } catch (error: any) {
      console.error('Session check failed:', error);
      setError(error?.message || 'Failed to check session');
      // Don't block the app if session check fails
      setUser(null);
    } finally {
      // Always set loading to false, even on error
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await checkSession();
    } catch (error: any) {
      // Only log if it's not a credential error to reduce noise
      const isCredentialError = 
        error.message?.toLowerCase().includes('invalid') || 
        error.message?.toLowerCase().includes('password') ||
        error.message?.toLowerCase().includes('credential');
        
      if (!isCredentialError) {
        console.error('Login error:', error);
      }
      throw error;
    }
  };

  const loginWithGoogle = async (callbackURL?: string) => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: callbackURL || '/dashboard',
      });
    } catch (error: any) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await checkSession();
    } catch (error: any) {
      // Only log if it's not a "user exists" error
      const isUserExistsError = 
        error.message?.toLowerCase().includes('exists') || 
        error.message?.toLowerCase().includes('already in use');
        
      if (!isUserExistsError) {
        console.error('Registration error:', error);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Initiating logout...');
      await authClient.signOut();
      console.log('✅ authClient.signOut() completed');
    } catch (error) {
      console.error('⚠️ Logout error with authClient:', error);
      
      // Fallback: try direct fetch to ensure server session is cleared
      try {
        console.log('🔄 Attempting fallback logout via fetch...');
        await fetch('/api/auth/sign-out', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Fallback logout completed');
      } catch (e) {
        console.error('❌ Fallback logout failed:', e);
      }
    } finally {
      // Always clear local state regardless of server response
      console.log('🧹 Clearing local user state');
      setUser(null);
      // Clear cached user ID in data service
      SupabaseDataService.clearUserCache();
      
      // Optional: Redirect to home or login page
      // window.location.href = '/';
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Better Auth password reset
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
  };

  return (
    <BetterAuthContext.Provider value={value}>
      {children}
    </BetterAuthContext.Provider>
  );
}

export function useBetterAuth() {
  const context = useContext(BetterAuthContext);
  if (context === undefined) {
    throw new Error('useBetterAuth must be used within a BetterAuthProvider');
  }
  return context;
}
