import Redis from 'ioredis';
import { getRedisOptions, buildRedisKey, getTTL } from '../config/redis';
import { logger } from '../services/LoggerService';
import crypto from 'crypto';

export interface APIKey {
  id: string;
  name: string;
  permissions: string[];
  created_at: string;
  last_used?: string;
  status: 'active' | 'revoked';
  rate_limit?: {
    requests_per_minute: number;
    requests_per_hour: number;
    requests_per_day: number;
  };
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
}

/**
 * Redis-based API Authentication Service
 * Uses specific key prefixes for API management
 */
export class RedisAPIAuthService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(getRedisOptions());
    
    this.redis.on('connect', () => {
      console.log('🟢 Redis connected for API Auth service');
    });
    
    this.redis.on('error', (error) => {
      console.error('🔴 Redis API Auth connection error:', error.message);
    });
    
    this.redis.on('close', () => {
      console.log('🟡 Redis API Auth connection closed');
    });
  }

  /**
   * Generate a new API key
   */
  generateAPIKey(): string {
    return 'sk_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store API key in Redis
   */
  async storeAPIKey(apiKey: APIKey): Promise<void> {
    try {
      const key = buildRedisKey('apiKey', apiKey.id);
      const ttl = getTTL('apiKey');
      
      await this.redis.setex(key, ttl, JSON.stringify(apiKey));
      
      logger.logRequest({ method: 'REDIS', url: `store-apikey:${apiKey.id}`, timestamp: new Date() } as any, 
        `API Key stored: ${apiKey.name} (ID: ${apiKey.id})`);
    } catch (error) {
      logger.logError(new Error(`Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw new Error('Failed to store API key');
    }
  }

  /**
   * Get API key from Redis
   */
  async getAPIKey(keyId: string): Promise<APIKey | null> {
    try {
      const key = buildRedisKey('apiKey', keyId);
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as APIKey;
    } catch (error) {
      logger.logError(new Error(`Failed to get API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Update API key
   */
  async updateAPIKey(apiKey: APIKey): Promise<void> {
    try {
      const key = buildRedisKey('apiKey', apiKey.id);
      
      // Check if key exists
      const exists = await this.redis.exists(key);
      if (!exists) {
        throw new Error(`API key ${apiKey.id} does not exist`);
      }
      
      // Get remaining TTL
      const ttl = await this.redis.ttl(key);
      const finalTtl = ttl > 0 ? ttl : getTTL('apiKey');
      
      await this.redis.setex(key, finalTtl, JSON.stringify(apiKey));
      
      logger.logRequest({ method: 'REDIS', url: `update-apikey:${apiKey.id}`, timestamp: new Date() } as any, 
        `API Key updated: ${apiKey.name} (ID: ${apiKey.id})`);
    } catch (error) {
      logger.logError(new Error(`Failed to update API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw error;
    }
  }

  /**
   * Delete API key
   */
  async deleteAPIKey(keyId: string): Promise<void> {
    try {
      const key = buildRedisKey('apiKey', keyId);
      await this.redis.del(key);
      
      logger.logRequest({ method: 'REDIS', url: `delete-apikey:${keyId}`, timestamp: new Date() } as any, 
        `API Key deleted: ${keyId}`);
    } catch (error) {
      logger.logError(new Error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw error;
    }
  }

  /**
   * List all API keys
   */
  async listAPIKeys(): Promise<APIKey[]> {
    try {
      const pattern = buildRedisKey('apiKey', '*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }
      
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.get(key));
      
      const results = await pipeline.exec();
      const apiKeys: APIKey[] = [];
      
      if (results) {
        for (const result of results) {
          if (result && result[1]) {
            try {
              const apiKey = JSON.parse(result[1] as string);
              apiKeys.push(apiKey);
            } catch (parseError) {
              // Skip invalid entries
              continue;
            }
          }
        }
      }
      
      return apiKeys;
    } catch (error) {
      logger.logError(new Error(`Failed to list API keys: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return [];
    }
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(keyId: string, limits: { minute: number; hour: number; day: number }): Promise<{
    allowed: boolean;
    limits: {
      minute: RateLimitInfo;
      hour: RateLimitInfo;
      day: RateLimitInfo;
    };
  }> {
    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const hour = Math.floor(now / 3600000);
      const day = Math.floor(now / 86400000);
      
      const keys = {
        minute: buildRedisKey('rateLimit', `${keyId}:min:${minute}`),
        hour: buildRedisKey('rateLimit', `${keyId}:hour:${hour}`),
        day: buildRedisKey('rateLimit', `${keyId}:day:${day}`)
      };
      
      const pipeline = this.redis.pipeline();
      
      // Get current counts
      pipeline.get(keys.minute);
      pipeline.get(keys.hour);
      pipeline.get(keys.day);
      
      const results = await pipeline.exec();
      
      const counts = {
        minute: parseInt((results?.[0]?.[1] as string) || '0'),
        hour: parseInt((results?.[1]?.[1] as string) || '0'),
        day: parseInt((results?.[2]?.[1] as string) || '0')
      };
      
      // Check if any limit is exceeded
      const allowed = counts.minute < limits.minute && 
                     counts.hour < limits.hour && 
                     counts.day < limits.day;
      
      if (allowed) {
        // Increment counters
        const incrementPipeline = this.redis.pipeline();
        incrementPipeline.incr(keys.minute);
        incrementPipeline.expire(keys.minute, 60);
        incrementPipeline.incr(keys.hour);
        incrementPipeline.expire(keys.hour, 3600);
        incrementPipeline.incr(keys.day);
        incrementPipeline.expire(keys.day, 86400);
        
        await incrementPipeline.exec();
      }
      
      return {
        allowed,
        limits: {
          minute: { count: counts.minute, resetTime: (minute + 1) * 60000 },
          hour: { count: counts.hour, resetTime: (hour + 1) * 3600000 },
          day: { count: counts.day, resetTime: (day + 1) * 86400000 }
        }
      };
    } catch (error) {
      logger.logError(new Error(`Failed to check rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`));
      // Allow request if rate limit check fails
      return {
        allowed: true,
        limits: {
          minute: { count: 0, resetTime: Date.now() + 60000 },
          hour: { count: 0, resetTime: Date.now() + 3600000 },
          day: { count: 0, resetTime: Date.now() + 86400000 }
        }
      };
    }
  }

  /**
   * Get rate limit status for API key
   */
  async getRateLimitStatus(keyId: string): Promise<{
    minute: RateLimitInfo;
    hour: RateLimitInfo;
    day: RateLimitInfo;
  }> {
    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const hour = Math.floor(now / 3600000);
      const day = Math.floor(now / 86400000);
      
      const keys = {
        minute: buildRedisKey('rateLimit', `${keyId}:min:${minute}`),
        hour: buildRedisKey('rateLimit', `${keyId}:hour:${hour}`),
        day: buildRedisKey('rateLimit', `${keyId}:day:${day}`)
      };
      
      const pipeline = this.redis.pipeline();
      pipeline.get(keys.minute);
      pipeline.get(keys.hour);
      pipeline.get(keys.day);
      
      const results = await pipeline.exec();
      
      return {
        minute: { 
          count: parseInt((results?.[0]?.[1] as string) || '0'), 
          resetTime: (minute + 1) * 60000 
        },
        hour: { 
          count: parseInt((results?.[1]?.[1] as string) || '0'), 
          resetTime: (hour + 1) * 3600000 
        },
        day: { 
          count: parseInt((results?.[2]?.[1] as string) || '0'), 
          resetTime: (day + 1) * 86400000 
        }
      };
    } catch (error) {
      logger.logError(new Error(`Failed to get rate limit status: ${error instanceof Error ? error.message : 'Unknown error'}`));
      const now = Date.now();
      return {
        minute: { count: 0, resetTime: now + 60000 },
        hour: { count: 0, resetTime: now + 3600000 },
        day: { count: 0, resetTime: now + 86400000 }
      };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.logRequest({ method: 'REDIS', url: 'disconnect', timestamp: new Date() } as any, 
        'Redis API Auth connection closed');
    } catch (error) {
      logger.logError(new Error(`Error closing Redis API Auth connection: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}