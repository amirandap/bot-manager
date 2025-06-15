/**
 * @swagger
 * tags:
 *   - name: Bot Messaging
 *     description: WhatsApp bot messaging endpoints
 *   - name: Bots
 *     description: Bot management operations
 *   - name: PM2 Management
 *     description: PM2 process management for bots
 *   - name: WhatsApp Bot Direct API
 *     description: Direct endpoints available on each WhatsApp bot instance
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WhatsAppGroupInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: WhatsApp group ID
 *           example: "1234567890@g.us"
 *         name:
 *           type: string
 *           description: Group name
 *           example: "My Test Group"
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Participant phone number
 *               isAdmin:
 *                 type: boolean
 *                 description: Whether participant is group admin
 *
 *     WhatsAppStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [connected, disconnected, qr_required]
 *           description: WhatsApp connection status
 *         phoneNumber:
 *           type: string
 *           description: Bot's phone number if connected
 *         pushName:
 *           type: string
 *           description: Bot's display name in WhatsApp
 *         battery:
 *           type: object
 *           properties:
 *             percentage:
 *               type: number
 *               description: Battery percentage
 *             plugged:
 *               type: boolean
 *               description: Whether device is plugged in
 *
 *     QRCodeResponse:
 *       type: object
 *       properties:
 *         qr:
 *           type: string
 *           description: Base64 encoded QR code image
 *         url:
 *           type: string
 *           description: URL to view QR code in browser
 */

/**
 * WhatsApp Bot Direct API Documentation
 *
 * Each WhatsApp bot instance runs its own API server on a specific port.
 * These endpoints are called directly on the bot's API host:port.
 *
 * Base URL Pattern: http://{bot.apiHost}:{bot.apiPort}
 *
 * Available endpoints on each bot:
 *
 * GET /status - Get bot connection status
 * GET /qr-code - Get QR code for WhatsApp authentication
 * GET /groups - Get list of WhatsApp groups
 * POST /send-message - Send WhatsApp message
 * POST /restart - Restart the bot
 * POST /change-fallback-number - Change fallback phone number
 *
 * Note: These endpoints are accessed through the bot manager's proxy endpoint:
 * POST /api/bots/{id}/send - which forwards to the bot's /send-message endpoint
 */
