"use client";

import { useBetterAuth } from '../contexts/better-auth-context';
import { LandingPage } from '../components/auth/landing-page';
import { Dashboard } from '../components/dashboard';
import { OmnifolioLogo } from '../components/ui/omnifolio-logo';

export default function Home() {
  const { isAuthenticated, isLoading } = useBetterAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900">
        <div className="text-center">
          <OmnifolioLogo size="xl" showText={false} className="justify-center mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading OmniFolio...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated, dashboard if authenticated
  return isAuthenticated ? <Dashboard /> : <LandingPage />;
}
