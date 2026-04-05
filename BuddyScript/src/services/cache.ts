import { createClient } from 'redis';
import { config } from '../config/env';

type MemoryEntry = {
  expiresAt: number;
  value: string;
};

const memoryCache = new Map<string, MemoryEntry>();
const memoryPrefixIndex = new Map<string, Set<string>>();
let redisClient: any = null;
let redisEnabled = false;
const MAX_MEMORY_CACHE_ENTRIES = 2000;
const CACHE_KEY_SEPARATOR = ':';

const buildKeyPrefixes = (key: string): string[] => {
  const segments = key.split(CACHE_KEY_SEPARATOR);
  if (segments.length < 3) {
    return [];
  }

  // Cache keys currently follow "<scope>:limit:<n>" and invalidation uses "<scope>:".
  // Example:
  // feed:user:123:limit:20 -> feed:user:123:
  const scopePrefix = `${segments.slice(0, -2).join(CACHE_KEY_SEPARATOR)}${CACHE_KEY_SEPARATOR}`;
  return [scopePrefix];
};

const getPrefixIndexKey = (prefix: string): string =>
  `cache-prefix-index:${encodeURIComponent(prefix)}`;

const removeMemoryCacheKey = (key: string) => {
  memoryCache.delete(key);

  for (const [prefix, keys] of memoryPrefixIndex.entries()) {
    keys.delete(key);
    if (keys.size === 0) {
      memoryPrefixIndex.delete(prefix);
    }
  }
};

const pruneMemoryCacheIfNeeded = () => {
  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }

    removeMemoryCacheKey(oldestKey);
  }
};

const indexMemoryKey = (key: string) => {
  const prefixes = buildKeyPrefixes(key);
  prefixes.forEach((prefix) => {
    const keys = memoryPrefixIndex.get(prefix) || new Set<string>();
    keys.add(key);
    memoryPrefixIndex.set(prefix, keys);
  });
};

const indexRedisKey = async (client: any, key: string) => {
  const prefixes = buildKeyPrefixes(key);
  if (!prefixes.length) {
    return;
  }

  const pipeline = client.multi();
  prefixes.forEach((prefix) => {
    pipeline.sAdd(getPrefixIndexKey(prefix), key);
  });
  await pipeline.exec();
};

const deleteRedisByPrefixScan = async (client: any, prefix: string) => {
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

const deleteRedisByPrefixFromIndex = async (client: any, prefix: string) => {
  const indexKey = getPrefixIndexKey(prefix);
  const trackedKeys: string[] = await client.sMembers(indexKey);

  if (trackedKeys.length > 0) {
    await client.del(trackedKeys);
    await client.del(indexKey);
    return;
  }

  // Fallback for cache keys written before prefix indexing existed.
  await deleteRedisByPrefixScan(client, prefix);
};

const getRedisClient = async (): Promise<any | null> => {
  if (!config.redisUrl) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const client = createClient({ url: config.redisUrl });
    client.on('error', (error) => {
      console.error('Redis cache client error:', error);
    });

    await client.connect();
    redisClient = client;
    redisEnabled = true;
    return redisClient;
  } catch (error) {
    console.error('Failed to connect Redis cache client. Falling back to memory cache.', error);
    redisClient = null;
    redisEnabled = false;
    return null;
  }
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
    removeMemoryCacheKey(key);
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
    await indexRedisKey(client, key);
    return;
  }

  memoryCache.set(key, {
    value: payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  indexMemoryKey(key);
  pruneMemoryCacheIfNeeded();
};

const deleteMemoryByPrefix = (prefix: string) => {
  const indexedKeys = memoryPrefixIndex.get(prefix);

  if (indexedKeys && indexedKeys.size > 0) {
    indexedKeys.forEach((key) => removeMemoryCacheKey(key));
    memoryPrefixIndex.delete(prefix);
    return;
  }

  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith(prefix)) {
      removeMemoryCacheKey(key);
    }
  }
};

export const invalidateCachePrefixes = async (prefixes: string[]): Promise<void> => {
  if (!prefixes.length) {
    return;
  }

  const client = await getRedisClient();

  if (client) {
    await Promise.all(prefixes.map((prefix) => deleteRedisByPrefixFromIndex(client, prefix)));
    return;
  }

  prefixes.forEach(deleteMemoryByPrefix);
};

export const isRedisCacheEnabled = (): boolean => redisEnabled;
