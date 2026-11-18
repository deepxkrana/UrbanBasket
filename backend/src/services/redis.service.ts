import { getRedisClient } from '../config/redis';

export class RedisService {
  /**
   * Retrieve cached data by key
   */
  static async getCache<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      if (!client) return null;
      const data = await client.get<T>(key);
      return data;
    } catch (err) {
      console.warn(`Redis getCache failed for key "${key}":`, err);
      return null;
    }
  }

  /**
   * Store cached data with optional TTL (in seconds)
   */
  static async setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client) return;
      if (ttlSeconds > 0) {
        await client.set(key, value, { ex: ttlSeconds });
      } else {
        await client.set(key, value);
      }
    } catch (err) {
      console.warn(`Redis setCache failed for key "${key}":`, err);
    }
  }

  /**
   * Delete a cache key
   */
  static async deleteCache(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client) return;
      await client.del(key);
    } catch (err) {
      console.warn(`Redis deleteCache failed for key "${key}":`, err);
    }
  }

  /**
   * Invalidate product details and catalog search caches
   */
  static async invalidateProductCache(productId: string): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client) return;
      await client.del(`product:${productId}`);
      // Also invalidate broad search catalog caches
      await client.del('products:search:all');
      console.log(`🧹 Invalidation triggered for product:${productId}`);
    } catch (err) {
      console.warn(`Failed to invalidate product cache for ${productId}:`, err);
    }
  }
}
