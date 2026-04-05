import * as z from 'zod';

const LoginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    rememberMe: z.boolean().default(false).optional(),
});

type IFormInput = z.infer<typeof LoginSchema>;
export { LoginSchema, type IFormInput };