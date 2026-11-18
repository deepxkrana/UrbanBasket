import { Redis } from '@upstash/redis';
import { env } from './env';

let upstashRedis: Redis | null = null;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    upstashRedis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize Upstash Redis REST client:', err);
  }
}

export const getRedisClient = (): Redis | null => upstashRedis;
