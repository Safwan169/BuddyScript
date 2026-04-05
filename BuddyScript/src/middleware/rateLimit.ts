import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { config } from '../config/env';

const limiterHandler = (message: string) => {
  return (_req: any, res: any) => {
    res.status(429).json({
      success: false,
      message,
    });
  };
};

let sharedStore: RedisStore | undefined;

if (config.redisUrl) {
  const redisClient = createClient({ url: config.redisUrl });

  redisClient.on('error', (error) => {
    console.error('Redis rate-limit client error:', error);
  });

  redisClient.connect().catch((error) => {
    console.error('Failed to connect Redis for rate limiter:', error);
  });

  sharedStore = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  });
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  ...(sharedStore ? { store: sharedStore } : {}),
  handler: limiterHandler('Too many login attempts. Please try again in 15 minutes.'),
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  ...(sharedStore ? { store: sharedStore } : {}),
  handler: limiterHandler('Too many registration attempts. Please try again in 1 hour.'),
});

const createApiLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(sharedStore ? { store: sharedStore } : {}),
    handler: limiterHandler(message),
  });

// Feed reads can be frequent, but still need guardrails.
export const feedReadRateLimiter = createApiLimiter(
  60 * 1000,
  120,
  'Too many feed requests. Please slow down and try again shortly.'
);

// Social interactions are write-heavy and should be throttled more strictly.
export const socialWriteRateLimiter = createApiLimiter(
  60 * 1000,
  80,
  'Too many write actions. Please try again in a moment.'
);

export const socialReadRateLimiter = createApiLimiter(
  60 * 1000,
  180,
  'Too many read actions. Please try again in a moment.'
);
