import multer from 'multer';
import { AppError } from './errorHandler';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new AppError(400, 'Only image files are allowed'));
      return;
    }

    cb(null, true);
  },
});

export const uploadSingleImage = upload.single('image');
