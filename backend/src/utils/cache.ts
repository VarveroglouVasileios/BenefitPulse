import Redis from 'ioredis';
import { config } from '../config/env';

// Create a singleton Redis instance for caching
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = config.redis.url 
      ? new Redis(config.redis.url, { maxRetriesPerRequest: null })
      : new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          maxRetriesPerRequest: null,
        });
  }
  return redisClient;
}

/**
 * Utility to get cached data or fetch and cache it if not available
 * @param key Redis cache key
 * @param fetchFn Function to execute if cache miss
 * @param ttlSeconds Time to live in seconds (default 10 minutes)
 */
export async function getOrCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 600
): Promise<T> {
  const redis = getRedisClient();
  
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error(`Cache Read Error for key ${key}:`, err);
  }

  // Cache miss - fetch fresh data
  const data = await fetchFn();

  try {
    // Save to cache asynchronously (don't block the return)
    if (data !== null && data !== undefined) {
      redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(err => {
        console.error(`Cache Write Error for key ${key}:`, err);
      });
    }
  } catch (err) {
    console.error(`Cache Write Error for key ${key}:`, err);
  }

  return data;
}

/**
 * Invalidate a specific cache key or keys matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();
  try {
    if (!pattern.includes('*')) {
      await redis.del(pattern);
      return;
    }
    
    // For patterns, use keys (fine for small cache, use SCAN for large)
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error(`Cache Invalidation Error for pattern ${pattern}:`, err);
  }
}