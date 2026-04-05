import { z } from "zod";
import { validatePasswordPolicy, passwordPolicyMessages } from '../utils/passwordPolicy';

// Register validation schema
export const registerSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters long")
      .max(50, "First name cannot exceed 50 characters")
      .trim(),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters long")
      .max(50, "Last name cannot exceed 50 characters")
      .trim(),
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z
      .string()
      .min(8, passwordPolicyMessages.minLength)
      .max(100, "Password cannot exceed 100 characters")
      .superRefine((value, ctx) => {
        const checks = validatePasswordPolicy(value);

        if (!checks.uppercase) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: passwordPolicyMessages.uppercase,
          });
        }

        if (!checks.lowercase) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: passwordPolicyMessages.lowercase,
          });
        }

        if (!checks.number) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: passwordPolicyMessages.number,
          });
        }

        if (!checks.symbol) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: passwordPolicyMessages.symbol,
          });
        }
      }),
  }),
});

// Login validation schema
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required"),
  }),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
