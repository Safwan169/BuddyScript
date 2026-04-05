import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadSingleImage } from '../middleware/upload';
import { uploadPostImage } from '../controllers/media.controller';

const router = Router();

router.use(authenticate);
router.post('/upload', uploadSingleImage, uploadPostImage);

export default router;
