import Redis from 'ioredis';
import { getRedisOptions, buildRedisKey, getTTL } from '../config/redis';
import { logger } from './LoggerService';
import { StoredVerification } from '../types/verification.types';

/**
 * Redis service for OTP verification storage
 * 
 * Uses specific keys for verification data:
 * - verify:{sid} - Main verification data
 * - verify:phone:{phoneNumber} - Phone to SID mapping
 * - verify:stats - Service statistics
 */
export class RedisOTPService {
  private redis: Redis;
  private keyPrefix: string = 'verify';

  constructor() {
    this.redis = new Redis(getRedisOptions());
    
    this.redis.on('connect', () => {
      console.log('🟢 Redis connected for OTP service');
    });
    
    this.redis.on('error', (error) => {
      console.error('🔴 Redis connection error:', error.message);
    });
    
    this.redis.on('close', () => {
      console.log('🟡 Redis connection closed');
    });
  }

  /**
   * Store verification data in Redis
   */
  async storeVerification(data: StoredVerification): Promise<void> {
    try {
      const key = buildRedisKey('verification', data.sid);
      const ttl = getTTL('verification');
      
      // Store verification data with TTL
      const verificationData = JSON.stringify({
        ...data,
        createdAt: data.createdAt.toISOString(),
        expiresAt: data.expiresAt.toISOString(),
        updatedAt: data.updatedAt?.toISOString()
      });
      
      await this.redis.setex(key, ttl, verificationData);
      
      // Also store a reverse lookup by phone number for easy access
      const phoneKey = buildRedisKey('verification', `phone:${data.phoneNumber}`);
      await this.redis.setex(phoneKey, ttl, data.sid);
      
      logger.logRequest({ method: 'REDIS', url: `store:${data.sid}`, timestamp: new Date() } as any, 
        `Verification stored for ${data.phoneNumber} (SID: ${data.sid})`);
    } catch (error) {
      logger.logError(new Error(`Failed to store verification: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw new Error('Failed to store verification data');
    }
  }

  /**
   * Get verification by SID
   */
  async getVerification(sid: string): Promise<StoredVerification | null> {
    try {
      const key = buildRedisKey('verification', sid);
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      
      // Convert ISO strings back to Date objects
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        expiresAt: new Date(parsed.expiresAt),
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : undefined
      };

    } catch (error) {
      logger.logError(new Error(`Failed to get verification from Redis: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Get verification by phone number
   */
  async getVerificationByPhone(phoneNumber: string): Promise<StoredVerification | null> {
    try {
      const phoneKey = buildRedisKey('verification', `phone:${phoneNumber}`);
      const sid = await this.redis.get(phoneKey);

      if (!sid) {
        return null;
      }

      return this.getVerification(sid);

    } catch (error) {
      logger.logError(new Error(`Failed to get verification by phone from Redis: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Update verification data
   */
  async updateVerification(verification: StoredVerification): Promise<void> {
    try {
      const key = buildRedisKey('verification', verification.sid);
      
      // Check if verification still exists (not expired)
      const exists = await this.redis.exists(key);
      if (!exists) {
        logger.logError(new Error(`Attempted to update expired/non-existent verification: ${verification.sid}`));
        return;
      }

      // Get remaining TTL
      const ttl = await this.redis.ttl(key);
      
      if (ttl <= 0) {
        logger.logError(new Error(`Verification has expired, cannot update: ${verification.sid}`));
        return;
      }

      // Update with current TTL
      verification.updatedAt = new Date();
      
      const verificationData = JSON.stringify({
        ...verification,
        createdAt: verification.createdAt.toISOString(),
        expiresAt: verification.expiresAt.toISOString(),
        updatedAt: verification.updatedAt.toISOString()
      });

      await this.redis.setex(key, ttl, verificationData);

      logger.logRequest({ method: 'REDIS', url: `update:${verification.sid}`, timestamp: new Date() } as any, 
        `Verification updated (SID: ${verification.sid}, TTL: ${ttl})`);

    } catch (error) {
      logger.logError(new Error(`Failed to update verification in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw error;
    }
  }

  /**
   * Delete verification manually
   */
  async deleteVerification(sid: string): Promise<void> {
    try {
      // Get verification to find phone number
      const verification = await this.getVerification(sid);
      
      if (verification) {
        const pipeline = this.redis.pipeline();
        pipeline.del(buildRedisKey('verification', sid));
        pipeline.del(buildRedisKey('verification', `phone:${verification.phoneNumber}`));
        await pipeline.exec();

        logger.logRequest({ method: 'REDIS', url: `delete:${sid}`, timestamp: new Date() } as any, 
          `Verification deleted (SID: ${sid}, Phone: ${verification.phoneNumber})`);
      }

    } catch (error) {
      logger.logError(new Error(`Failed to delete verification from Redis: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw error;
    }
  }

  /**
   * Get verification statistics
   */
  async getStats(): Promise<{
    totalActive: number;
    pendingCount: number;
    approvedCount: number;
    failedCount: number;
  }> {
    try {
      // Get all verification keys
      const keys = await this.redis.keys('verification:*');
      
      let pendingCount = 0;
      let approvedCount = 0;
      let failedCount = 0;

      // Get all verifications in batch
      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach((key: string) => pipeline.get(key));
        const results = await pipeline.exec();

        results?.forEach(([error, data]: [Error | null, any]) => {
          if (!error && data) {
            try {
              const verification = JSON.parse(data as string);
              switch (verification.status) {
                case 'pending':
                  pendingCount++;
                  break;
                case 'approved':
                  approvedCount++;
                  break;
                case 'failed':
                  failedCount++;
                  break;
              }
            } catch (parseError) {
              // Skip invalid data
            }
          }
        });
      }

      return {
        totalActive: keys.length,
        pendingCount,
        approvedCount,
        failedCount
      };

    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Failed to get verification stats from Redis');
      return {
        totalActive: 0,
        pendingCount: 0,
        approvedCount: 0,
        failedCount: 0
      };
    }
  }

  /**
   * Clean up expired verifications manually
   * (Redis TTL should handle this automatically, but this is for manual cleanup)
   */
  async cleanupExpired(): Promise<number> {
    try {
      const keys = await this.redis.keys('verification:*');
      let cleanedCount = 0;

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach((key: string) => pipeline.get(key));
        const results = await pipeline.exec();

        const expiredKeys: string[] = [];
        const expiredPhones: string[] = [];

        results?.forEach(([error, data]: [Error | null, any], index: number) => {
          if (!error && data) {
            try {
              const verification = JSON.parse(data as string);
              const expiresAt = new Date(verification.expiresAt);
              
              if (expiresAt < new Date()) {
                expiredKeys.push(keys[index]);
                expiredPhones.push(`phone:${verification.phoneNumber}`);
                cleanedCount++;
              }
            } catch (parseError) {
              // Invalid data, mark for cleanup
              expiredKeys.push(keys[index]);
              cleanedCount++;
            }
          }
        });

        // Delete expired entries
        if (expiredKeys.length > 0) {
          const deletePipeline = this.redis.pipeline();
          expiredKeys.forEach((key: string) => deletePipeline.del(key));
          expiredPhones.forEach((phoneKey: string) => deletePipeline.del(phoneKey));
          await deletePipeline.exec();
        }
      }

      if (cleanedCount > 0) {
        logger.getPinoLogger().info({
          cleanedCount,
          remainingKeys: keys.length - cleanedCount
        }, 'Cleaned up expired verifications from Redis');
      }

      return cleanedCount;

    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Failed to cleanup expired verifications from Redis');
      return 0;
    }
  }

  /**
   * Check Redis connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Redis health check failed');
      return false;
    }
  }

  /**
   * Get Redis connection info
   */
  async getConnectionInfo(): Promise<{
    status: string;
    connectedClients: number;
    usedMemory: string;
    totalKeys: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const totalKeys = await this.redis.dbsize();

      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const usedMemory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // For connected clients, we'll use a simpler approach
      let connectedClients = 1; // At least our connection
      try {
        const clientListResult = await this.redis.call('CLIENT', 'LIST');
        if (typeof clientListResult === 'string') {
          connectedClients = clientListResult.split('\n').filter(line => line.trim()).length;
        }
      } catch (clientError) {
        // If CLIENT LIST fails, just use 1
        connectedClients = 1;
      }

      return {
        status: 'connected',
        connectedClients,
        usedMemory,
        totalKeys
      };

    } catch (error) {
      logger.logError(new Error(`Failed to get Redis connection info: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return {
        status: 'error',
        connectedClients: 0,
        usedMemory: 'unknown',
        totalKeys: 0
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
        'Redis connection closed for OTP service');
    } catch (error) {
      logger.logError(new Error(`Error closing Redis connection: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}