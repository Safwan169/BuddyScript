import { createClient } from 'redis';
import { config } from '../config/env';

type MemoryEntry = {
  expiresAt: number;
  value: string;
};

const memoryCache = new Map<string, MemoryEntry>();
let redisClient: any = null;
let redisEnabled = false;

const getRedisClient = async (): Promise<any | null> => {
  if (!config.redisUrl) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const client = createClient({ url: config.redisUrl });
  client.on('error', (error) => {
    console.error('Redis cache client error:', error);
  });

  await client.connect();
  redisClient = client;
  redisEnabled = true;
  return redisClient;
};

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  const client = await getRedisClient();

  if (client) {
    const raw = await client.get(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  }

  const memoryEntry = memoryCache.get(key);
  if (!memoryEntry) {
    return null;
  }

  if (Date.now() > memoryEntry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return JSON.parse(memoryEntry.value) as T;
};

export const setCachedJson = async (
  key: string,
  value: unknown,
  ttlSeconds = config.cacheTtlSeconds
): Promise<void> => {
  const payload = JSON.stringify(value);
  const client = await getRedisClient();

  if (client) {
    await client.set(key, payload, { EX: ttlSeconds });
    return;
  }

  memoryCache.set(key, {
    value: payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const deleteMemoryByPrefix = (prefix: string) => {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
};

const deleteRedisByPrefix = async (client: any, prefix: string) => {
  const pattern = `${prefix}*`;
  const keysToDelete: string[] = [];

  for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 200 })) {
    if (typeof key === 'string') {
      keysToDelete.push(key);
    }

    if (keysToDelete.length >= 200) {
      await client.del(keysToDelete);
      keysToDelete.length = 0;
    }
  }

  if (keysToDelete.length) {
    await client.del(keysToDelete);
  }
};

export const invalidateCachePrefixes = async (prefixes: string[]): Promise<void> => {
  if (!prefixes.length) {
    return;
  }

  const client = await getRedisClient();

  if (client) {
    await Promise.all(prefixes.map((prefix) => deleteRedisByPrefix(client, prefix)));
    return;
  }

  prefixes.forEach(deleteMemoryByPrefix);
};

export const isRedisCacheEnabled = (): boolean => redisEnabled;
