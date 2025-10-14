/**
 * Redis Configuration for Bot Manager OTP Service
 * Uses different key prefixes to avoid conflicts with existing Redis usage
 */

export interface RedisConfig {
  host: string;
  port: number;
  db?: number;
  password?: string;
  keyPrefix: {
    verification: string;
    apiKey: string;
    rateLimit: string;
  };
  ttl: {
    verification: number; // seconds
    apiKey: number; // seconds  
    rateLimit: number; // seconds
  };
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
  password: process.env.REDIS_PASSWORD,
  
  // Use specific key prefixes for our OTP service
  keyPrefix: {
    verification: 'botmgr:otp:verify:',
    apiKey: 'botmgr:otp:apikey:',
    rateLimit: 'botmgr:otp:ratelimit:'
  },
  
  // TTL configurations
  ttl: {
    verification: 10 * 60, // 10 minutes for OTP codes
    apiKey: 7 * 24 * 60 * 60, // 7 days for API key cache
    rateLimit: 60 // 1 minute for rate limit windows
  }
};

/**
 * Get Redis connection options
 */
export function getRedisOptions() {
  const options: any = {
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4, // IPv4
  };

  if (redisConfig.password) {
    options.password = redisConfig.password;
  }

  return options;
}

/**
 * Build Redis key with proper prefix
 */
export function buildRedisKey(type: keyof typeof redisConfig.keyPrefix, key: string): string {
  return `${redisConfig.keyPrefix[type]}${key}`;
}

/**
 * Get TTL for specific key type
 */
export function getTTL(type: keyof typeof redisConfig.ttl): number {
  return redisConfig.ttl[type];
}