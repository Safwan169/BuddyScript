import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { uploadImageBuffer } from '../services/mediaStorage';
import { enqueueMediaProcessingJob } from '../services/mediaJobs';

export const uploadPostImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  if (!req.file) {
    throw new AppError(400, 'Image file is required');
  }

  const imageUrl = await uploadImageBuffer(req.file.buffer, req.file.mimetype);
  await enqueueMediaProcessingJob(imageUrl, 'media-upload');

  const response: ApiResponse = {
    success: true,
    message: 'Image uploaded successfully',
    data: {
      imageUrl,
    },
  };

  res.status(201).json(response);
});
