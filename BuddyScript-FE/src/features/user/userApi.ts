import { baseApi } from '@/lib/baseApi';
import type { ApiResponse, AuthUser } from '@/types/api';

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type AuthSessionPayload = {
  user: AuthUser;
  legacyAccessToken: string | null;
};

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthSessionPayload, LoginPayload>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<AuthUser>) => ({
        user: response.data,
        legacyAccessToken: response.token || null,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<AuthSessionPayload, RegisterPayload>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<AuthUser>) => ({
        user: response.data,
        legacyAccessToken: response.token || null,
      }),
      invalidatesTags: ['User'],
    }),

    getProfile: builder.query<AuthUser, void>({
      query: () => ({ url: '/auth/me' }),
      transformResponse: (response: ApiResponse<AuthUser>) => response.data,
      providesTags: ['User'],
    }),

    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      transformResponse: () => ({ success: true }),
      invalidatesTags: ['User', 'Feed'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useLogoutMutation,
} = userApi;
