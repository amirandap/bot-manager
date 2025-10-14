import { Request, Response } from 'express';
import { APIAuthService } from '../../middleware/apiAuth';
import type { APIKey } from '../../services/RedisAPIAuthService';
import { logger } from '../../services/LoggerService';

/**
 * Controller for API key management
 * These endpoints are for administrative purposes
 */
export class APIKeyController {
  private authService: APIAuthService;

  constructor() {
    this.authService = APIAuthService.getInstance();
  }

  /**
   * Create a new API key
   */
  async createAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { 
        name, 
        permissions = ['verify:create', 'verify:check'], 
        rateLimit 
      } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({
          code: 60200,
          message: "'name' is required and must be a string",
          status: 400
        });
        return;
      }

      // Create API key with the auth service
      const result = await this.authService.createAPIKey(name, permissions, rateLimit);

      logger.logRequest(req, `API Key created: ${name} (ID: ${result.keyData.id})`);

      res.status(201).json({
        success: true,
        data: {
          id: result.keyData.id,
          name: result.keyData.name,
          key: result.key, // Only returned once on creation
          permissions: result.keyData.permissions,
          status: result.keyData.status,
          rate_limit: result.keyData.rate_limit,
          created_at: result.keyData.created_at,
          message: 'API key created successfully. Store the key securely as it will not be displayed again.'
        }
      });
    } catch (error) {
      logger.logError(new Error(`Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      res.status(500).json({
        code: 60500,
        message: 'Internal server error while creating API key',
        status: 500
      });
    }
  }

  /**
   * List all API keys (without showing the actual keys)
   */
  async listAPIKeys(req: Request, res: Response): Promise<void> {
    try {
      const apiKeys = await this.authService.listAPIKeys();

      const safeApiKeys = apiKeys.map((apiKey: APIKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        status: apiKey.status,
        created_at: apiKey.created_at,
        last_used: apiKey.last_used,
        rate_limit: apiKey.rate_limit
      }));

      res.json({
        success: true,
        data: {
          apiKeys: safeApiKeys,
          count: safeApiKeys.length
        }
      });
    } catch (error) {
      logger.logError(new Error(`Failed to list API keys: ${error instanceof Error ? error.message : 'Unknown error'}`));
      res.status(500).json({
        code: 60500,
        message: 'Internal server error while listing API keys',
        status: 500
      });
    }
  }

  /**
   * Get specific API key details
   */
  async getAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      if (!keyId) {
        res.status(400).json({
          error: 'API key ID is required',
          code: 'MISSING_KEY_ID'
        });
        return;
      }

      const apiKeys = await this.authService.listAPIKeys();
      const apiKey = apiKeys.find((key: any) => key.id === keyId);

      if (!apiKey) {
        res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
        return;
      }

      res.json({
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        rate_limit: apiKey.rate_limit,
        status: apiKey.status,
        created_at: apiKey.created_at,
        last_used: apiKey.last_used
      });

    } catch (error) {
      logger.logError(new Error(`Error getting API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      
      res.status(500).json({
        error: 'Failed to get API key',
        code: 'GET_FAILED'
      });
    }
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      if (!keyId) {
        res.status(400).json({
          error: 'API key ID is required',
          code: 'MISSING_KEY_ID'
        });
        return;
      }

      const success = await this.authService.revokeAPIKey(keyId);

      if (!success) {
        res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND'
        });
        return;
      }

      logger.getPinoLogger().info({
        keyId,
        revokedBy: (req as any).apiKey?.id || 'system'
      }, 'API key revoked');

      res.json({
        message: 'API key revoked successfully',
        keyId
      });

    } catch (error) {
      logger.logError(new Error(`Error revoking API key: ${error instanceof Error ? error.message : 'Unknown error'}`));
      
      res.status(500).json({
        error: 'Failed to revoke API key',
        code: 'REVOKE_FAILED'
      });
    }
  }

  /**
   * Test API key authentication
   */
  async testAuth(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = (req as any).apiKey as APIKey;

      res.json({
        message: 'Authentication successful',
        keyId: apiKey.id,
        keyName: apiKey.name,
        permissions: apiKey.permissions,
        last_used: apiKey.last_used,
        rate_limit: apiKey.rate_limit
      });

    } catch (error) {
      logger.logError(new Error(`Error in auth test: ${error instanceof Error ? error.message : 'Unknown error'}`));
      
      res.status(500).json({
        error: 'Authentication test failed',
        code: 'TEST_FAILED'
      });
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;

      if (!keyId) {
        res.status(400).json({
          error: 'API key ID is required',
          code: 'MISSING_KEY_ID'
        });
        return;
      }

      // TODO: Implement detailed usage statistics from Redis
      // For now, return basic info
      res.json({
        keyId,
        message: 'Usage statistics not yet implemented',
        note: 'This endpoint will provide detailed usage metrics in a future version'
      });

    } catch (error) {
      logger.getPinoLogger().error({ error, keyId: req.params.keyId }, 'Error getting usage stats');
      
      res.status(500).json({
        error: 'Failed to get usage statistics',
        code: 'STATS_FAILED'
      });
    }
  }
}