import { baseApi } from '@/lib/baseApi';
import type { ApiResponse } from '@/types/api';

type UploadImageResponse = {
  imageUrl: string;
};

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadImage: builder.mutation<UploadImageResponse, FormData>({
      query: (body) => ({
        url: '/media/upload',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<UploadImageResponse>) => response.data,
    }),
  }),
  overrideExisting: true,
});

export const { useUploadImageMutation } = mediaApi;
