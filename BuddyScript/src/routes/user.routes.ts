import { Router } from 'express';
import { getUsers, getUserById } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validateRequest';
import { getUserByIdSchema, getUsersQuerySchema } from '../validators/user.validator';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.route('/').get(validateRequest(getUsersQuerySchema), getUsers);

router.route('/:id').get(validateRequest(getUserByIdSchema), getUserById);

export default router;
