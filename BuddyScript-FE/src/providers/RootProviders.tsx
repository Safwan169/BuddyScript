'use client';

import { useEffect } from 'react';
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { store, type RootState } from '@/store/store';
import { useGetProfileQuery } from '@/features/user/userApi';
import {
  clearAuth,
  markAuthChecked,
  setSessionFromProfile,
  hydrateSavedSession,
} from '@/features/user/userSlice';
import { resolveSessionBootstrapAction } from '@/lib/authFlow';

const SessionBootstrap = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { authChecked, isAuthenticated } = useSelector((state: RootState) => state.user);
  const isAuthPage = pathname === '/login' || pathname === '/register';
  // Skip only after session has been server-verified (authChecked), not just because
  // isAuthenticated is true from localStorage — we always need one server round-trip.
  const shouldSkipProfileQuery = isAuthPage || authChecked;

  // Hydrate Redux from localStorage on first mount so the user isn't stuck on a
  // spinner while getProfile is in-flight.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bs_session');
      if (raw) {
        const saved = JSON.parse(raw);
        dispatch(hydrateSavedSession(saved));
      }
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isSuccess, isError, isLoading, error } = useGetProfileQuery(undefined, {
    skip: shouldSkipProfileQuery,
    refetchOnMountOrArgChange: true,
  });

  const errorStatus =
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: number | string }).status
      : undefined;

  useEffect(() => {
    const action = resolveSessionBootstrapAction({
      isAuthPage,
      authChecked,
      isSuccess,
      isError,
      hasData: Boolean(data),
      errorStatus,
    });

    if (action === 'setSession' && data) {
      dispatch(setSessionFromProfile(data));
    } else if (action === 'clearAuth') {
      dispatch(clearAuth());
    } else if (action === 'markChecked') {
      dispatch(markAuthChecked());
    }
  }, [authChecked, data, dispatch, errorStatus, isAuthPage, isError, isSuccess]);

  if (!isAuthPage && !authChecked && isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
        <div className="spinner-border" role="status" aria-label="Loading session" />
      </div>
    );
  }

  return <>{children}</>;
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <SessionBootstrap>{children}</SessionBootstrap>
    </ReduxProvider>
  );
}

export default Providers;
