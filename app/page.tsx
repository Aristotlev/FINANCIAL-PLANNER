"use client";

import { useBetterAuth } from '../contexts/better-auth-context';
import { LandingPage } from '../components/auth/landing-page';
import { Dashboard } from '../components/dashboard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading } = useBetterAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Money Hub...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated, dashboard if authenticated
  return isAuthenticated ? <Dashboard /> : <LandingPage />;
}
