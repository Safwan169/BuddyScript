'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { shouldRedirectProtected } from '@/lib/authFlow';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, authChecked } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (shouldRedirectProtected({ authChecked, isAuthenticated })) {
      router.replace('/login');
    }
  }, [authChecked, isAuthenticated, router]);

  // No session at all yet — show spinner while we wait for localStorage + server check
  if (!authChecked && !isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
        <div className="spinner-border" role="status" aria-label="Checking session" />
      </div>
    );
  }

  // Server confirmed: not authenticated — show spinner while redirect fires
  if (authChecked && !isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
        <div className="spinner-border" role="status" aria-label="Redirecting" />
      </div>
    );
  }

  // Either server-confirmed authenticated, or localStorage says authenticated while
  // server round-trip is still in-flight — render children optimistically.
  return <>{children}</>;
};
