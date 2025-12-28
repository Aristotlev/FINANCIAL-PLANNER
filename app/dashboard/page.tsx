"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBetterAuth } from '../../contexts/better-auth-context';
import { Dashboard } from '../../components/dashboard';
import { Preloader } from '../../components/ui/preloader';

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useBetterAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <Preloader />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return <Dashboard />;
}
