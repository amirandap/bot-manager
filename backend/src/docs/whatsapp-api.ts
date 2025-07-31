/**
 * @swagger
 * tags:
 *   - name: Bot Messaging
 *     description: WhatsApp bot messaging endpoints with smart routing and enhanced error handling
 *   - name: Bots
 *     description: Bot management operations
 *   - name: PM2 Management
 *     description: PM2 process management for bots
 *   - name: WhatsApp Bot Direct API
 *     description: Direct endpoints available on each WhatsApp bot instance
 *   - name: Error Handling
 *     description: Standardized error handling system with post-send error detection
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
 *
 *     ErrorHandlingResponse:
 *       type: object
 *       properties:
 *         errorType:
 *           type: string
 *           enum: [SESSION_CORRUPTED, CRITICAL_ERROR, VALIDATION_ERROR]
 *           description: |
 *             Error classification for handling:
 *             - SESSION_CORRUPTED: Post-send serialization errors (ignored, no fallback)
 *             - CRITICAL_ERROR: Pre-send failures (triggers fallback)
 *             - VALIDATION_ERROR: Input validation failures
 *         shouldSendFallback:
 *           type: boolean
 *           description: Whether this error type should trigger fallback message
 *         description:
 *           type: string
 *           description: Human-readable error description
 *
 *     SmartRoutingInfo:
 *       type: object
 *       properties:
 *         messageType:
 *           type: string
 *           enum: [INDIVIDUAL, GROUP, HYBRID, BROADCAST, UNKNOWN]
 *           description: |
 *             Message type based on recipients:
 *             - INDIVIDUAL: Single phone number
 *             - GROUP: Single or multiple groups
 *             - HYBRID: Mix of phones and groups
 *             - BROADCAST: Multiple phones
 *             - UNKNOWN: Fallback routing
 *         endpoint:
 *           type: string
 *           enum: [/send-to-phone, /send-to-group, /send-broadcast, /send-message]
 *           description: Optimal bot endpoint selected for routing
 *         recipients:
 *           type: object
 *           properties:
 *             phones:
 *               type: array
 *               items:
 *                 type: string
 *               description: Phone number recipients
 *             groups:
 *               type: array
 *               items:
 *                 type: string
 *               description: Group ID recipients
 *             total:
 *               type: number
 *               description: Total recipient count
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
 * GET /get-groups - Get list of WhatsApp groups
 * POST /send-message - Send WhatsApp message (legacy unified endpoint)
 * POST /send-to-phone - Send message to phone number(s) (optimized)
 * POST /send-to-group - Send message to group(s) (optimized) 
 * POST /send-broadcast - Send message to mixed recipients (optimized)
 * POST /pending - Send pending message
 * POST /followup - Send follow-up message
 * POST /receive-image-and-json - Send image with JSON data
 * POST /restart - Restart the bot
 * POST /change-fallback-number - Change fallback phone number
 *
 * Smart Endpoint Routing:
 * The backend automatically determines the optimal endpoint based on recipient types:
 * - Phone numbers only → /send-to-phone
 * - Groups only → /send-to-group  
 * - Mixed recipients → /send-broadcast
 * - Unknown/legacy → /send-message
 *
 * Enhanced Error Handling:
 * - SESSION_CORRUPTED errors are detected as post-send and ignored (no fallback)
 * - CRITICAL_ERROR types trigger appropriate fallback messages
 * - All errors are categorized for better debugging and handling
 *
 * Unified Addressing:
 * The 'to' field supports mixed arrays of phone numbers and group IDs:
 * ["1234567890@c.us", "987654321@g.us"] → automatically routed to /send-broadcast
 *
 * Note: These endpoints are accessed through the bot manager's proxy endpoint:
 * POST /api/bots/send-message - which forwards to the optimal bot endpoint
 */
