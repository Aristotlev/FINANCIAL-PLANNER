"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
      if (response.data && 'user' in response.data && response.data.user) {
        const sessionData = response.data;
        
        console.log('✅ Session user data:', {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name,
          image: sessionData.user.image,
        });
        
        // Always use the avatar proxy endpoint - it handles all cases:
        // - Proxies Google images (avoids CORS)
        // - Returns initials SVG if no image
        // - Returns default icon if not authenticated
        console.log('📸 Using avatar endpoint: /api/auth/avatar');
        
        setUser({
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name || sessionData.user.email.split('@')[0],
          avatarUrl: '/api/auth/avatar',
        });
        
        // Redirect back to original location after OAuth
        const returnTo = sessionStorage.getItem('auth_return_to');
        if (returnTo) {
          sessionStorage.removeItem('auth_return_to');
          window.location.href = returnTo;
        }
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
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Save current URL to return after OAuth
      const returnTo = window.location.pathname + window.location.search;
      if (returnTo !== '/') {
        sessionStorage.setItem('auth_return_to', returnTo);
      }
      
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin,
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
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authClient.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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
