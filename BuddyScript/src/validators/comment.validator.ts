import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createCommentSchema = z.object({
  params: z.object({
    postId: z.string().regex(objectIdRegex, 'Invalid post id'),
  }),
  body: z.object({
    content: z.string().trim().min(1, 'Comment is required').max(1000),
  }),
});

export const updateCommentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid comment id'),
  }),
  body: z.object({
    content: z.string().trim().min(1, 'Comment is required').max(1000),
  }),
});

export const getCommentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid comment id'),
  }),
});

export const getCommentsSchema = z.object({
  params: z.object({
    postId: z.string().regex(objectIdRegex, 'Invalid post id'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    before: z.string().optional(),
    beforeId: z.string().regex(objectIdRegex, 'Invalid cursor id').optional(),
  }),
});

export const createReplySchema = z.object({
  params: z.object({
    commentId: z.string().regex(objectIdRegex, 'Invalid comment id'),
  }),
  body: z.object({
    content: z.string().trim().min(1, 'Reply is required').max(1000),
  }),
});

export const getRepliesSchema = z.object({
  params: z.object({
    commentId: z.string().regex(objectIdRegex, 'Invalid comment id'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    before: z.string().optional(),
    beforeId: z.string().regex(objectIdRegex, 'Invalid cursor id').optional(),
  }),
});
