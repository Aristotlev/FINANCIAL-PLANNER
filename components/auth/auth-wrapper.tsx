"use client";

import { useBetterAuth } from '../../contexts/better-auth-context';
import { Dashboard } from '../dashboard';
import { OmnifolioLogo } from '../ui/omnifolio-logo';
import { useEffect, useState } from 'react';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useBetterAuth();
  const [showLoading, setShowLoading] = useState(true);

  // Use a small timeout to prevent flashing if auth is super fast, 
  // but primarily we want to show the landing page (children) immediately for LCP.
  // However, if we are authenticated, we want to switch to Dashboard.
  
  // Strategy:
  // 1. Initial render (Server & Client hydration): Show children (Landing Page).
  // 2. useEffect checks auth.
  // 3. If authenticated -> Show Dashboard.
  // 4. If not authenticated -> Keep showing children.
  
  // We don't need a loading spinner because the Landing Page serves as the "loading" state
  // for unauthenticated users (which is the target for LCP).
  // For authenticated users, they might see a flash of Landing Page.
  
  // To minimize flash for authenticated users, we could check if we have a token in localStorage
  // before first render, but that causes hydration mismatch.
  
  // So we accept the trade-off: Great LCP for public, slight flash for logged-in.
  
  if (isAuthenticated) {
    return <Dashboard />;
  }

  return <>{children}</>;
}
