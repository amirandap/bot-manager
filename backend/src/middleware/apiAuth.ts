import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../services/LoggerService';
import { RedisAPIAuthService } from '../services/RedisAPIAuthService';
import type { APIKey } from '../services/RedisAPIAuthService';

/**
 * Extended Request interface with API key information
 */
export interface AuthenticatedRequest extends Request {
  apiKey?: APIKey;
  rateLimitInfo?: any;
}

/**
 * Default rate limits
 */
const DEFAULT_RATE_LIMITS = {
  requests_per_minute: 60,
  requests_per_hour: 1000,
  requests_per_day: 10000
};

/**
 * API Authentication Service
 */
export class APIAuthService {
  private static instance: APIAuthService;
  private redisService: RedisAPIAuthService;

  private constructor() {
    this.redisService = new RedisAPIAuthService();
  }

  static getInstance(): APIAuthService {
    if (!APIAuthService.instance) {
      APIAuthService.instance = new APIAuthService();
    }
    return APIAuthService.instance;
  }

  /**
   * Create a new API key
   */
  async createAPIKey(
    name: string, 
    permissions: string[] = ['verify:create', 'verify:check'], 
    rateLimit?: { requests_per_minute: number; requests_per_hour: number; requests_per_day: number }
  ): Promise<{ key: string; keyData: APIKey }> {
    try {
      const key = this.redisService.generateAPIKey();
      const keyId = crypto.createHash('sha256').update(key).digest('hex');
      
      const apiKey: APIKey = {
        id: keyId,
        name,
        permissions,
        created_at: new Date().toISOString(),
        status: 'active',
        rate_limit: rateLimit || DEFAULT_RATE_LIMITS
      };

      await this.redisService.storeAPIKey(apiKey);

      logger.logRequest({ method: 'API', url: 'create-key', timestamp: new Date() } as any, 
        `API Key created: ${name} (ID: ${keyId})`);

      return { key, keyData: apiKey };
    } catch (error) {
      logger.logError(new Error(`Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(key: string): Promise<APIKey | null> {
    try {
      const keyId = crypto.createHash('sha256').update(key).digest('hex');
      const apiKey = await this.redisService.getAPIKey(keyId);

      if (!apiKey) {
        return null;
      }

      // Check if key is active
      if (apiKey.status !== 'active') {
        logger.logRequest({ method: 'API', url: 'validate-key', timestamp: new Date() } as any, 
          `Inactive API key attempted: ${keyId}`);
        return null;
      }

      // Update last used timestamp
      apiKey.last_used = new Date().toISOString();
      await this.redisService.updateAPIKey(apiKey).catch(() => {
        // Non-critical error, continue with validation
      });

      return apiKey;
    } catch (error) {
      logger.logError(new Error(`Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Check rate limits for API key
   */
  async checkRateLimit(apiKey: APIKey): Promise<{ allowed: boolean; headers: Record<string, string> }> {
    try {
      const limits = apiKey.rate_limit || DEFAULT_RATE_LIMITS;
      
      // Convert to the format expected by RedisAPIAuthService
      const rateLimitParams = {
        minute: limits.requests_per_minute,
        hour: limits.requests_per_hour,
        day: limits.requests_per_day
      };
      
      const result = await this.redisService.checkRateLimit(apiKey.id, rateLimitParams);

      const headers = {
        'X-RateLimit-Limit-Minute': limits.requests_per_minute.toString(),
        'X-RateLimit-Remaining-Minute': Math.max(0, limits.requests_per_minute - result.limits.minute.count).toString(),
        'X-RateLimit-Reset-Minute': Math.ceil(result.limits.minute.resetTime / 1000).toString(),
        'X-RateLimit-Limit-Hour': limits.requests_per_hour.toString(),
        'X-RateLimit-Remaining-Hour': Math.max(0, limits.requests_per_hour - result.limits.hour.count).toString(),
        'X-RateLimit-Reset-Hour': Math.ceil(result.limits.hour.resetTime / 1000).toString(),
        'X-RateLimit-Limit-Day': limits.requests_per_day.toString(),
        'X-RateLimit-Remaining-Day': Math.max(0, limits.requests_per_day - result.limits.day.count).toString(),
        'X-RateLimit-Reset-Day': Math.ceil(result.limits.day.resetTime / 1000).toString()
      };

      return { allowed: result.allowed, headers };
    } catch (error) {
      logger.logError(new Error(`Failed to check rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`));
      // Allow on error
      return { allowed: true, headers: {} };
    }
  }

  /**
   * List all API keys
   */
  async listAPIKeys(): Promise<APIKey[]> {
    try {
      return await this.redisService.listAPIKeys();
    } catch (error) {
      logger.logError(new Error(`Failed to list API keys: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return [];
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId: string): Promise<boolean> {
    try {
      const apiKey = await this.redisService.getAPIKey(keyId);
      if (!apiKey) {
        return false;
      }

      apiKey.status = 'revoked';
      await this.redisService.updateAPIKey(apiKey);

      logger.logRequest({ method: 'API', url: 'revoke-key', timestamp: new Date() } as any, 
        `API Key revoked: ${apiKey.name} (ID: ${keyId})`);

      return true;
    } catch (error) {
      logger.logError(new Error(`Failed to revoke API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return false;
    }
  }

  /**
   * Test API key authentication
   */
  async testAuth(key: string): Promise<{ valid: boolean; keyData?: APIKey; error?: string }> {
    try {
      const apiKey = await this.validateAPIKey(key);
      if (!apiKey) {
        return { valid: false, error: 'Invalid API key' };
      }

      const rateLimitResult = await this.checkRateLimit(apiKey);
      if (!rateLimitResult.allowed) {
        return { valid: false, error: 'Rate limit exceeded' };
      }

      return { valid: true, keyData: apiKey };
    } catch (error) {
      return { 
        valid: false, 
        error: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

/**
 * Express middleware for API authentication
 */
export function apiAuthMiddleware(requiredPermission?: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract API key from header or query parameter
      const authHeader = req.headers.authorization;
      const queryKey = req.query.api_key as string;
      
      let apiKey: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      } else if (queryKey) {
        apiKey = queryKey;
      }

      if (!apiKey) {
        return res.status(401).json({
          code: 20001,
          message: 'API key is required',
          status: 401
        });
      }

      // Validate API key
      const authService = APIAuthService.getInstance();
      const validatedKey = await authService.validateAPIKey(apiKey);

      if (!validatedKey) {
        return res.status(401).json({
          code: 20003,
          message: 'Invalid API key',
          status: 401
        });
      }

      // Check required permission
      if (requiredPermission && !validatedKey.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          code: 20005,
          message: `Insufficient permissions. Required: ${requiredPermission}`,
          status: 403
        });
      }

      // Check rate limits
      const rateLimitResult = await authService.checkRateLimit(validatedKey);

      // Add rate limit headers
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          code: 20007,
          message: 'Rate limit exceeded',
          status: 429
        });
      }

      // Attach API key info to request
      req.apiKey = validatedKey;
      req.rateLimitInfo = rateLimitResult;

      next();
    } catch (error) {
      logger.logError(new Error(`API authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return res.status(500).json({
        code: 20500,
        message: 'Internal authentication error',
        status: 500
      });
    }
  };
}