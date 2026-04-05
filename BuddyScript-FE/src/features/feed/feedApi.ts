import { baseApi } from '@/lib/baseApi';
import type {
  ApiResponse,
  CommentsPayload,
  FeedPayload,
  FeedPost,
  LikesPayload,
  RepliesPayload,
  SocialComment,
} from '@/types/api';

type FeedQueryArgs = {
  limit?: number;
  before?: string;
  beforeId?: string;
};

type CursorQueryArgs = {
  limit?: number;
  before?: string;
  beforeId?: string;
};

type FeedMutationResult = {
  liked: boolean;
  likeCount: number;
  reactionType?: string;
};

export const feedApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeed: builder.query<FeedPayload, FeedQueryArgs | void>({
      query: (args) => ({
        url: '/posts',
        params: args || undefined,
      }),
      transformResponse: (response: ApiResponse<FeedPayload>) => response.data,
      providesTags: ['Feed'],
    }),

    createPost: builder.mutation<FeedPost, { content: string; imageUrl?: string; visibility: 'public' | 'private' }>({
      query: (body) => ({
        url: '/posts',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<FeedPost>) => response.data,
      invalidatesTags: ['Feed'],
    }),

    likePost: builder.mutation<FeedMutationResult, { postId: string; reactionType?: string }>({
      query: ({ postId, reactionType }) => ({
        url: `/posts/${postId}/like`,
        method: 'POST',
        body: { reactionType: reactionType || 'like' },
      }),
      transformResponse: (response: ApiResponse<FeedMutationResult>) => response.data,
      invalidatesTags: ['Feed'],
    }),

    unlikePost: builder.mutation<FeedMutationResult, { postId: string }>({
      query: ({ postId }) => ({
        url: `/posts/${postId}/like`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<FeedMutationResult>) => response.data,
      invalidatesTags: ['Feed'],
    }),

    getPostLikes: builder.query<LikesPayload, { postId: string } & CursorQueryArgs>({
      query: ({ postId, ...params }) => ({
        url: `/posts/${postId}/likes`,
        params,
      }),
      transformResponse: (response: ApiResponse<LikesPayload>) => response.data,
    }),

    getComments: builder.query<CommentsPayload, { postId: string } & CursorQueryArgs>({
      query: ({ postId, ...params }) => ({
        url: `/posts/${postId}/comments`,
        params,
      }),
      transformResponse: (response: ApiResponse<CommentsPayload>) => response.data,
      providesTags: (_result, _error, arg) => [{ type: 'Comment', id: arg.postId }],
    }),

    createComment: builder.mutation<SocialComment, { postId: string; content: string }>({
      query: ({ postId, content }) => ({
        url: `/posts/${postId}/comments`,
        method: 'POST',
        body: { content },
      }),
      transformResponse: (response: ApiResponse<SocialComment>) => response.data,
      invalidatesTags: (_result, _error, arg) => [
        'Feed',
        { type: 'Comment', id: arg.postId },
      ],
    }),

    likeComment: builder.mutation<FeedMutationResult, { commentId: string; postId: string; reactionType?: string }>({
      query: ({ commentId, reactionType }) => ({
        url: `/comments/${commentId}/like`,
        method: 'POST',
        body: { reactionType: reactionType || 'like' },
      }),
      transformResponse: (response: ApiResponse<FeedMutationResult>) => response.data,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Comment', id: arg.postId }],
    }),

    unlikeComment: builder.mutation<FeedMutationResult, { commentId: string; postId: string }>({
      query: ({ commentId }) => ({
        url: `/comments/${commentId}/like`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<FeedMutationResult>) => response.data,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Comment', id: arg.postId }],
    }),

    getCommentLikes: builder.query<LikesPayload, { commentId: string } & CursorQueryArgs>({
      query: ({ commentId, ...params }) => ({
        url: `/comments/${commentId}/likes`,
        params,
      }),
      transformResponse: (response: ApiResponse<LikesPayload>) => response.data,
    }),

    getReplies: builder.query<RepliesPayload, { commentId: string } & CursorQueryArgs>({
      query: ({ commentId, ...params }) => ({
        url: `/comments/${commentId}/replies`,
        params,
      }),
      transformResponse: (response: ApiResponse<RepliesPayload>) => response.data,
      providesTags: (_result, _error, arg) => [{ type: 'Reply', id: arg.commentId }],
    }),

    createReply: builder.mutation<SocialComment, { commentId: string; content: string; postId: string }>({
      query: ({ commentId, content }) => ({
        url: `/comments/${commentId}/replies`,
        method: 'POST',
        body: { content },
      }),
      transformResponse: (response: ApiResponse<SocialComment>) => response.data,
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Reply', id: arg.commentId },
        { type: 'Comment', id: arg.postId },
        'Feed',
      ],
    }),

    likeReply: builder.mutation<FeedMutationResult, { replyId: string; commentId: string; reactionType?: string }>({
      query: ({ replyId, reactionType }) => ({
        url: `/replies/${replyId}/like`,
        method: 'POST',
        body: { reactionType: reactionType || 'like' },
      }),
      transformResponse: (response: ApiResponse<FeedMutationResult>) => response.data,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Reply', id: arg.commentId }],
    }),

    unlikeReply: builder.mutation<FeedMutationResult, { replyId: string; commentId: string }>({
      query: ({ replyId }) => ({
        url: `/replies/${replyId}/like`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<FeedMutationResult>) => response.data,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Reply', id: arg.commentId }],
    }),

    getReplyLikes: builder.query<LikesPayload, { replyId: string } & CursorQueryArgs>({
      query: ({ replyId, ...params }) => ({
        url: `/replies/${replyId}/likes`,
        params,
      }),
      transformResponse: (response: ApiResponse<LikesPayload>) => response.data,
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetFeedQuery,
  useLazyGetFeedQuery,
  useCreatePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useGetPostLikesQuery,
  useLazyGetPostLikesQuery,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
  useCreateCommentMutation,
  useLikeCommentMutation,
  useUnlikeCommentMutation,
  useGetCommentLikesQuery,
  useLazyGetCommentLikesQuery,
  useGetRepliesQuery,
  useLazyGetRepliesQuery,
  useCreateReplyMutation,
  useLikeReplyMutation,
  useUnlikeReplyMutation,
  useGetReplyLikesQuery,
  useLazyGetReplyLikesQuery,
} = feedApi;
