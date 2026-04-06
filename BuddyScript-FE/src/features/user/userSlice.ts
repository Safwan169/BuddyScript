import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/types/api';
import { userApi } from './userApi';

const STORAGE_KEY = 'bs_session';

type PersistedSession = {
  user: AuthUser;
  legacyAccessToken?: string | null;
};

const normalizePersistedSession = (payload: PersistedSession | AuthUser): PersistedSession => {
  if (payload && typeof payload === 'object' && 'user' in payload) {
    const normalized = payload as PersistedSession;
    return {
      user: normalized.user,
      legacyAccessToken: normalized.legacyAccessToken || null,
    };
  }

  return {
    user: payload as AuthUser,
    legacyAccessToken: null,
  };
};

const saveSession = (user: AuthUser, legacyAccessToken?: string | null): void => {
  const payload: PersistedSession = {
    user,
    legacyAccessToken: legacyAccessToken || null,
  };

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* noop */ }
};

const clearSession = (): void => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
};

type UserState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  legacyAccessToken: string | null;
};

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  authChecked: false,
  legacyAccessToken: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    hydrateSavedSession: (state, action: PayloadAction<PersistedSession | AuthUser>) => {
      // Pre-populate from localStorage before server verification
      if (!state.authChecked) {
        const session = normalizePersistedSession(action.payload);
        state.user = session.user;
        state.isAuthenticated = true;
        state.legacyAccessToken = session.legacyAccessToken || null;
      }
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthUser; legacyAccessToken?: string | null }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.authChecked = true;
      state.legacyAccessToken = action.payload.legacyAccessToken || null;
      saveSession(action.payload.user, action.payload.legacyAccessToken || null);
    },
    setSessionFromProfile: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.authChecked = true;
      saveSession(action.payload, state.legacyAccessToken);
    },
    markAuthChecked: (state) => {
      state.authChecked = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authChecked = true;
      state.legacyAccessToken = null;
      clearSession();
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(userApi.endpoints.login.matchFulfilled, (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.authChecked = true;
      state.legacyAccessToken = action.payload.legacyAccessToken || null;
      saveSession(action.payload.user, action.payload.legacyAccessToken || null);
    });

    builder.addMatcher(userApi.endpoints.register.matchFulfilled, (state) => {
      // Registration should not auto-login; user must authenticate from /login.
      state.user = null;
      state.isAuthenticated = false;
      state.authChecked = true;
      state.legacyAccessToken = null;
      clearSession();
    });

    builder.addMatcher(userApi.endpoints.getProfile.matchFulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.authChecked = true;
      saveSession(action.payload, state.legacyAccessToken);
    });

    builder.addMatcher(userApi.endpoints.getProfile.matchRejected, (state, action) => {
      const httpStatus = (action.payload as any)?.status;
      // Only force-logout on definitive server rejection (401/403)
      // Network errors (FETCH_ERROR) keep the existing session alive
      if (httpStatus === 401 || httpStatus === 403) {
        state.user = null;
        state.isAuthenticated = false;
        state.legacyAccessToken = null;
        clearSession();
      }
      state.authChecked = true;
    });

    builder.addMatcher(userApi.endpoints.logout.matchFulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authChecked = true;
      state.legacyAccessToken = null;
      clearSession();
    });
  },
});

export const { hydrateSavedSession, setCredentials, setSessionFromProfile, markAuthChecked, clearAuth } =
  userSlice.actions;
export default userSlice.reducer;
