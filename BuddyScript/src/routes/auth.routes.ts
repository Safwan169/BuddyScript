import { Router } from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
} from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/auth';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimit';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { z } from 'zod';

const router = Router();

router.post('/register', registerRateLimiter, validateRequest(registerSchema), register);
router.post('/login', loginRateLimiter, validateRequest(loginSchema), login);
router.post('/logout', logout);

router.get('/me', authenticate, getProfile);
router.put(
  '/me',
  authenticate,
  validateRequest(
    z.object({
      body: z.object({
        firstName: z.string().min(2).max(50).optional(),
        lastName: z.string().min(2).max(50).optional(),
      }),
    })
  ),
  updateProfile
);

export default router;
