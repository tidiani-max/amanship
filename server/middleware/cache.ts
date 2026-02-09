import Redis from 'ioredis';
import type { Request, Response, NextFunction } from 'express';

// ==================== REDIS CLIENT ====================
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('❌ Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 1000);
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// ==================== CACHE MIDDLEWARE ====================
export const cacheMiddleware = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.json(JSON.parse(cached));
      }

      console.log(`❌ Cache MISS: ${key}`);

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json
      res.json = function(data: any) {
        // Cache the response
        redis.setex(key, duration, JSON.stringify(data)).catch(console.error);
        
        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// ==================== CACHE HELPERS ====================
export const invalidateCache = async (pattern: string) => {
  try {
    const keys = await redis.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Invalidated ${keys.length} cache keys`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

export const cacheSet = async (key: string, value: any, ttl: number = 300) => {
  try {
    await redis.setex(`cache:${key}`, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

export const cacheGet = async (key: string): Promise<any> => {
  try {
    const cached = await redis.get(`cache:${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

export { redis };