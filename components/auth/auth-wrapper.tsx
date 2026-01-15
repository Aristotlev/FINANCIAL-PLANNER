"use client";

import { useBetterAuth } from '../../contexts/better-auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useBetterAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/portfolio');
    }
  }, [isLoading, isAuthenticated, router]);

  return <>{children}</>;
}
