import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

const imageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value), 'Invalid image URL format');

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, 'Post content is required').max(5000),
    imageUrl: imageUrlSchema.optional(),
    visibility: z.enum(['public', 'private']).optional(),
  }),
});

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid post id'),
  }),
  body: z
    .object({
      content: z.string().trim().min(1).max(5000).optional(),
      imageUrl: imageUrlSchema.optional(),
      visibility: z.enum(['public', 'private']).optional(),
    })
    .refine(
      (value) =>
        value.content !== undefined ||
        value.imageUrl !== undefined ||
        value.visibility !== undefined,
      {
        message: 'At least one field must be provided for update',
      }
    ),
});

export const getPostSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid post id'),
  }),
});

export const getFeedSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    before: z.string().optional(),
    beforeId: z.string().regex(objectIdRegex, 'Invalid cursor id').optional(),
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>['body'];
export type UpdatePostInput = z.infer<typeof updatePostSchema>['body'];
