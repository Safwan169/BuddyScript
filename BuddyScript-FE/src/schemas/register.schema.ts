import * as z from 'zod'; 

const registrationSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Must be a valid email').min(1, 'Email is required'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
        .regex(/[a-z]/, 'Password must include at least one lowercase letter')
        .regex(/[0-9]/, 'Password must include at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must include at least one symbol')
        .min(1, 'Password is required'),
    repeatPassword: z.string().min(1, 'Repeat password is required'),
    terms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.repeatPassword, { // 4. Define cross-field refinement
    message: 'Passwords must match',
    path: ['repeatPassword'], // Attach the error to the repeatPassword field
});

export type IFormInput = z.infer<typeof registrationSchema>;
export { registrationSchema };
