import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');

const mimeToExtension: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const getExtensionByMimeType = (mimeType: string): string => {
  const normalized = mimeType.toLowerCase();
  const extension = mimeToExtension[normalized];

  if (!extension) {
    throw new AppError(400, 'Unsupported image type');
  }

  return extension;
};

const ensureUploadDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const saveImageToLocalStorage = async (
  buffer: Buffer,
  mimeType: string
): Promise<string> => {
  const extension = getExtensionByMimeType(mimeType);

  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  const relativeDir = path.join('posts', year, month);
  const absoluteDir = path.join(uploadsRoot, relativeDir);

  await ensureUploadDir(absoluteDir);

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const absoluteFilePath = path.join(absoluteDir, filename);
  await fs.writeFile(absoluteFilePath, buffer);

  const urlPath = path.join(relativeDir, filename).replace(/\\/g, '/');
  return `${config.appBaseUrl}/uploads/${urlPath}`;
};

const configureCloudinary = () => {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(
      500,
      'Cloudinary configuration is incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
};

const uploadImageToCloudinary = async (buffer: Buffer, mimeType: string): Promise<string> => {
  getExtensionByMimeType(mimeType);
  configureCloudinary();

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'buddyscript/posts',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError(500, 'Failed to upload image to Cloudinary'));
          return;
        }

        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
};

const uploadImageToStorage = async (buffer: Buffer, mimeType: string): Promise<string> => {
  switch (config.storageProvider) {
    case 'local':
      return saveImageToLocalStorage(buffer, mimeType);
    case 'cloudinary':
      try {
        return await uploadImageToCloudinary(buffer, mimeType);
      } catch (error: any) {
        const canFallbackToLocal = config.nodeEnv !== 'production';
        const isCloudinaryConfigIssue =
          error instanceof AppError &&
          error.message.includes('Cloudinary configuration is incomplete');

        if (canFallbackToLocal && isCloudinaryConfigIssue) {
          console.warn(
            'Cloudinary keys are missing. Falling back to local uploads for development.'
          );
          return saveImageToLocalStorage(buffer, mimeType);
        }

        throw error;
      }
    default:
      throw new AppError(500, 'Unsupported storage provider configuration');
  }
};

export const uploadImageBuffer = async (
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new AppError(400, 'Image file is empty');
  }

  return uploadImageToStorage(fileBuffer, mimeType);
};

export const resolveImageInputToUrl = async (
  imageInput?: string
): Promise<string | undefined> => {
  if (!imageInput) {
    return undefined;
  }

  const trimmed = imageInput.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  throw new AppError(400, 'Image must be uploaded via /media/upload or provided as a valid URL');
};
