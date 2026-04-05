import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
};

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001'),
  APP_BASE_URL: z.string().url().default('http://localhost:5000'),
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ENABLE_LEGACY_PAGE_PAGINATION: z.string().optional(),
  CACHE_TTL_SECONDS: z.string().default('60'),
  ENABLE_MEDIA_JOB_WORKER: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  JSON_BODY_LIMIT: z.string().default('2mb'),
  URLENCODED_BODY_LIMIT: z.string().default('2mb'),
});

const parseEnv = () => {
  try {
    return envSchema.parse({
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI,
      JWT_SECRET: process.env.JWT_SECRET,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      APP_BASE_URL: process.env.APP_BASE_URL,
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      REDIS_URL: process.env.REDIS_URL,
      ENABLE_LEGACY_PAGE_PAGINATION: process.env.ENABLE_LEGACY_PAGE_PAGINATION,
      CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS,
      ENABLE_MEDIA_JOB_WORKER: process.env.ENABLE_MEDIA_JOB_WORKER,
      COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE,
      JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT,
      URLENCODED_BODY_LIMIT: process.env.URLENCODED_BODY_LIMIT,
    });
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
};

const env = parseEnv();

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  mongoUri: env.MONGODB_URI,
  jwtSecret: env.JWT_SECRET,
  corsOrigin: env.CORS_ORIGIN,
  appBaseUrl: env.APP_BASE_URL,
  storageProvider: env.STORAGE_PROVIDER,
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },
  redisUrl: env.REDIS_URL,
  enableLegacyPagePagination: parseBoolean(
    env.ENABLE_LEGACY_PAGE_PAGINATION,
    env.NODE_ENV !== 'production'
  ),
  cacheTtlSeconds: Math.max(parseInt(env.CACHE_TTL_SECONDS, 10) || 60, 10),
  enableMediaJobWorker: parseBoolean(
    env.ENABLE_MEDIA_JOB_WORKER,
    env.NODE_ENV === 'production'
  ),
  cookieSameSite: env.COOKIE_SAME_SITE,
  jsonBodyLimit: env.JSON_BODY_LIMIT,
  urlencodedBodyLimit: env.URLENCODED_BODY_LIMIT,
} as const;
