import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store/store';

const SESSION_STORAGE_KEY = 'bs_session';
const LOCAL_BACKEND_PORT = '5000';

const getPersistedLegacyToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'legacyAccessToken' in parsed &&
      typeof parsed.legacyAccessToken === 'string' &&
      parsed.legacyAccessToken.trim().length > 0
    ) {
      return parsed.legacyAccessToken;
    }
  } catch (_error) {
    // ignore parse errors
  }

  return null;
};

const normalizeApiBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = parsed.pathname.replace(/\/+$/, '').replace(/(\/api)+$/, '/api');
    parsed.pathname = normalizedPath.endsWith('/api') ? normalizedPath : `${normalizedPath}/api`;
    return parsed.toString().replace(/\/+$/, '');
  } catch (_error) {
    // Fallback for malformed values or relative-like values.
  }

  if (trimmed.endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
};

const maybeAlignLocalhostHost = (urlValue: string): string => {
  if (typeof window === 'undefined') {
    return urlValue;
  }

  try {
    const parsed = new URL(urlValue);
    const configuredHost = parsed.hostname;
    const runtimeHost = window.location.hostname;

    const isLocalPair =
      (configuredHost === 'localhost' && runtimeHost === '127.0.0.1') ||
      (configuredHost === '127.0.0.1' && runtimeHost === 'localhost');

    if (isLocalPair) {
      parsed.hostname = runtimeHost;
    }

    const isConfiguredLocalhost =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (isConfiguredLocalhost && parsed.port && parsed.port !== LOCAL_BACKEND_PORT) {
      parsed.port = LOCAL_BACKEND_PORT;
    }

    return parsed.toString();
  } catch (_error) {
    return urlValue;
  }
};

const resolveApiBaseUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    return normalizeApiBaseUrl(maybeAlignLocalhostHost(configured));
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return normalizeApiBaseUrl(`${protocol}//${hostname}:${LOCAL_BACKEND_PORT}`);
  }

  return normalizeApiBaseUrl(`http://localhost:${LOCAL_BACKEND_PORT}`);
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: resolveApiBaseUrl(),
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    // Use Redux token first; fall back to persisted token to avoid hydration-race 401s.
    const stateToken = (getState() as RootState).user.legacyAccessToken;
    const token = stateToken || getPersistedLegacyToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithSessionHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const endpointName = api.endpoint;
    // Only auth-state endpoints should force a global logout.
    // Feature endpoints (e.g. feed refetch) may transiently return 401
    // and should surface errors locally without clearing the whole session.
    const shouldInvalidateSession = endpointName === 'getProfile' || endpointName === 'logout';

    if (shouldInvalidateSession) {
      api.dispatch({ type: 'user/clearAuth' });
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithSessionHandling,
  tagTypes: ['User', 'Feed', 'Comment', 'Reply', 'Like'],
  endpoints: () => ({}),
});
