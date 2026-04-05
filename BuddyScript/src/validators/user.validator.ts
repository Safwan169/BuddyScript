import { z } from 'zod';

// Create user validation schema
export const createUserSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters long')
      .max(50, 'First name cannot exceed 50 characters')
      .trim(),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters long')
      .max(50, 'Last name cannot exceed 50 characters')
      .trim(),
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    age: z
      .number()
      .int()
      .min(1, 'Age must be at least 1')
      .max(150, 'Age cannot exceed 150')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

// Update user validation schema
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters long')
      .max(50, 'First name cannot exceed 50 characters')
      .trim()
      .optional(),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters long')
      .max(50, 'Last name cannot exceed 50 characters')
      .trim()
      .optional(),
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase()
      .trim()
      .optional(),
    age: z
      .number()
      .int()
      .min(1, 'Age must be at least 1')
      .max(150, 'Age cannot exceed 150')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

// Get user by ID validation schema
export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
});

// Query validation schema (for pagination, filtering)
export const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    sort: z.string().optional(),
    isActive: z.string().optional(),
  }),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];

