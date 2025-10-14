import express from 'express';
import { APIKeyController } from '../controllers/apiKeys/APIKeyController';
import { apiAuthMiddleware } from '../middleware/apiAuth';

const router = express.Router();
const apiKeyController = new APIKeyController();

/**
 * API Key Management Routes
 * These routes are for administrative purposes only
 */

/**
 * @swagger
 * /auth/keys:
 *   post:
 *     summary: Create a new API key
 *     description: |
 *       Creates a new API key for accessing the verification API.
 *       Requires admin permissions.
 *     tags:
 *       - API Key Management
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Human-readable name for the API key
 *                 example: "Production App Server"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of permissions for this key
 *                 default: ["verify:*"]
 *                 example: ["verify:create", "verify:check"]
 *               rateLimits:
 *                 type: object
 *                 properties:
 *                   requestsPerMinute:
 *                     type: integer
 *                     default: 60
 *                     minimum: 1
 *                   requestsPerHour:
 *                     type: integer
 *                     default: 1000
 *                     minimum: 1
 *                   requestsPerDay:
 *                     type: integer
 *                     default: 10000
 *                     minimum: 1
 *               expiresInDays:
 *                 type: integer
 *                 description: Number of days until key expires (optional)
 *                 minimum: 1
 *                 example: 365
 *               metadata:
 *                 type: object
 *                 properties:
 *                   clientName:
 *                     type: string
 *                     example: "My App"
 *                   environment:
 *                     type: string
 *                     enum: [development, staging, production]
 *                   ipWhitelist:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["192.168.1.100", "10.0.0.0/8"]
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "ak_1234567890abcdef1234567890abcdef"
 *                 name:
 *                   type: string
 *                   example: "Production App Server"
 *                 key:
 *                   type: string
 *                   example: "otpkey_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 rateLimits:
 *                   type: object
 *                 warning:
 *                   type: string
 *                   example: "Store this API key securely. It will not be shown again."
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - invalid or missing API key
 *       500:
 *         description: Internal server error
 */
router.post('/auth/keys', 
  apiAuthMiddleware('admin'),
  apiKeyController.createAPIKey.bind(apiKeyController)
);

/**
 * @swagger
 * /auth/keys:
 *   get:
 *     summary: List all API keys
 *     description: |
 *       Retrieves a list of all API keys (without showing the actual key values).
 *       Requires admin permissions.
 *     tags:
 *       - API Key Management
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKeys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *                       rateLimits:
 *                         type: object
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       lastUsed:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/auth/keys', 
  apiAuthMiddleware('admin'),
  apiKeyController.listAPIKeys.bind(apiKeyController)
);

/**
 * @swagger
 * /auth/keys/{keyId}:
 *   get:
 *     summary: Get API key details
 *     description: |
 *       Retrieves details for a specific API key.
 *       Requires admin permissions.
 *     tags:
 *       - API Key Management
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         description: API key ID
 *         schema:
 *           type: string
 *           example: "ak_1234567890abcdef"
 *     responses:
 *       200:
 *         description: API key details
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/auth/keys/:keyId', 
  apiAuthMiddleware('admin'),
  apiKeyController.getAPIKey.bind(apiKeyController)
);

/**
 * @swagger
 * /auth/keys/{keyId}:
 *   delete:
 *     summary: Revoke an API key
 *     description: |
 *       Permanently revokes an API key, making it unusable.
 *       Requires admin permissions.
 *     tags:
 *       - API Key Management
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         description: API key ID to revoke
 *         schema:
 *           type: string
 *           example: "ak_1234567890abcdef"
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API key revoked successfully"
 *                 keyId:
 *                   type: string
 *                   example: "ak_1234567890abcdef"
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/auth/keys/:keyId', 
  apiAuthMiddleware('admin'),
  apiKeyController.revokeAPIKey.bind(apiKeyController)
);

/**
 * @swagger
 * /auth/test:
 *   get:
 *     summary: Test API key authentication
 *     description: |
 *       Tests if the provided API key is valid and returns key information.
 *       Useful for validating API key setup.
 *     tags:
 *       - API Key Management
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Authentication successful"
 *                 keyId:
 *                   type: string
 *                 keyName:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 rateLimits:
 *                   type: object
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Internal server error
 */
router.get('/auth/test', 
  apiAuthMiddleware(),
  apiKeyController.testAuth.bind(apiKeyController)
);

/**
 * @swagger
 * /auth/keys/{keyId}/usage:
 *   get:
 *     summary: Get API key usage statistics
 *     description: |
 *       Retrieves usage statistics for a specific API key.
 *       Requires admin permissions.
 *     tags:
 *       - API Key Management
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         description: API key ID
 *         schema:
 *           type: string
 *           example: "ak_1234567890abcdef"
 *     responses:
 *       200:
 *         description: Usage statistics
 *       404:
 *         description: API key not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/auth/keys/:keyId/usage', 
  apiAuthMiddleware('admin'),
  apiKeyController.getUsageStats.bind(apiKeyController)
);

export default router;