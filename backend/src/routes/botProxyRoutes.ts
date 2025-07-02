import { Router } from "express";
import multer from "multer";
import { BotProxyController } from "../controllers/botProxyController";

const router = Router();
const botProxyController = new BotProxyController();

// Configure multer for handling multipart/form-data
const upload = multer(); // No storage configuration needed for in-memory parsing

export function setBotProxyRoutes(app: Router) {
  // ===== CORE BOT OPERATIONS =====

  /**
   * @swagger
   * /api/bots/status:
   *   post:
   *     summary: Get bot status
   *     tags: [Bot Proxy - Core]
   *     description: Get current status and information of a specific bot
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *     responses:
   *       200:
   *         description: Bot status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "online"
   *                 uptime:
   *                   type: string
   *                   example: "1234 seconds"
   *                 fallbackNumber:
   *                   type: string
   *                   example: "+1234567890"
   *                 QrCode:
   *                   type: string
   *                   example: "http://localhost:3000/qr-code"
   *                 client:
   *                   type: object
   *                   description: WhatsApp client information
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/status",
    botProxyController.getBotStatus.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/qr-code:
   *   post:
   *     summary: Get QR code for WhatsApp authentication
   *     tags: [Bot Proxy - Core]
   *     description: Get QR code for WhatsApp bot authentication. Returns HTML page with QR code.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *     responses:
   *       200:
   *         description: QR code HTML page
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found or QR code not available
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/qr-code",
    botProxyController.getBotQRCode.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/qr-code/update:
   *   post:
   *     summary: Update QR code (internal use)
   *     tags: [Bot Proxy - Core]
   *     description: Update QR code for WhatsApp bot
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *     responses:
   *       200:
   *         description: QR code updated successfully
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/qr-code/update",
    botProxyController.updateBotQRCode.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/restart:
   *   post:
   *     summary: Restart bot
   *     tags: [Bot Proxy - Core]
   *     description: Restart a specific bot instance
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *     responses:
   *       200:
   *         description: Bot restarted successfully
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/restart",
    botProxyController.restartBot.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/change-fallback-number:
   *   post:
   *     summary: Change fallback number
   *     tags: [Bot Proxy - Core]
   *     description: Change the fallback phone number for a bot
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId, fallbackNumber]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               fallbackNumber:
   *                 type: string
   *                 description: New fallback phone number
   *                 example: "+1234567890"
   *     responses:
   *       200:
   *         description: Fallback number changed successfully
   *       400:
   *         description: Bot ID and fallback number are required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/change-fallback-number",
    botProxyController.changeFallbackNumber.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/change-port:
   *   post:
   *     summary: Change bot port
   *     tags: [Bot Proxy - Core]
   *     description: Change the API port for a bot
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId, port]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               port:
   *                 type: number
   *                 description: New port number
   *                 example: 3001
   *     responses:
   *       200:
   *         description: Port changed successfully
   *       400:
   *         description: Bot ID and port are required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/change-port",
    botProxyController.changePort.bind(botProxyController)
  );

  // ===== MESSAGING OPERATIONS =====

  /**
   * @swagger
   * /api/bots/send-message:
   *   post:
   *     summary: Send WhatsApp message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a message through WhatsApp bot with optional file attachment
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [botId, phoneNumber, message]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               phoneNumber:
   *                 type: string
   *                 description: Recipient phone number with country code
   *                 example: "+1234567890"
   *               message:
   *                 type: string
   *                 description: Message content
   *                 example: "Hello from WhatsApp Bot!"
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Optional file attachment
   *           examples:
   *             text_message:
   *               summary: Text message only
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "Hello! This is a test message from our WhatsApp bot."
   *             message_with_file:
   *               summary: Message with file attachment
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "Please find the attached document."
   *                 file: "[binary file data]"
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId, phoneNumber, message]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               phoneNumber:
   *                 oneOf:
   *                   - type: string
   *                   - type: array
   *                     items:
   *                       type: string
   *                 description: Recipient phone number(s) with country code
   *                 example: "+1234567890"
   *               message:
   *                 type: string
   *                 description: Message content
   *                 example: "Hello from WhatsApp Bot!"
   *               group_id:
   *                 type: string
   *                 description: WhatsApp group ID (alternative to phoneNumber)
   *                 example: "1234567890-1234567890@g.us"
   *               group_name:
   *                 type: string
   *                 description: WhatsApp group name
   *                 example: "My Test Group"
   *               discorduserid:
   *                 type: string
   *                 description: Discord user ID for cross-platform messaging
   *                 example: "123456789012345678"
   *           examples:
   *             single_phone:
   *               summary: Send to single phone number
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "Hello! This is a test message."
   *             multiple_phones:
   *               summary: Send to multiple phone numbers
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: ["+1234567890", "+0987654321", "+1122334455"]
   *                 message: "Bulk message to multiple recipients."
   *             group_message:
   *               summary: Send to WhatsApp group
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 group_id: "1234567890-1234567890@g.us"
   *                 group_name: "My Test Group"
   *                 message: "Hello everyone in the group!"
   *             discord_crosspost:
   *               summary: Cross-post to Discord
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 discorduserid: "123456789012345678"
   *                 message: "This message will be sent to both WhatsApp and Discord."
   *     responses:
   *       200:
   *         description: Message sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 result:
   *                   type: object
   *                   properties:
   *                     sent:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ["+1234567890", "+0987654321"]
   *                     errors:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           phoneNumber:
   *                             type: string
   *                           error:
   *                             type: string
   *                       example: []
   *       400:
   *         description: Bot ID, phone number, and message are required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/send-message",
    upload.single("file"),
    botProxyController.sendMessage.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/get-groups:
   *   post:
   *     summary: Get WhatsApp groups
   *     tags: [Bot Proxy - Messaging]
   *     description: Get list of WhatsApp groups the bot is a member of
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *           examples:
   *             get_groups:
   *               summary: Get bot groups
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *     responses:
   *       200:
   *         description: Groups retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 groups:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         description: Group ID
   *                         example: "1234567890-1234567890@g.us"
   *                       name:
   *                         type: string
   *                         description: Group name
   *                         example: "Family Chat"
   *                       description:
   *                         type: string
   *                         description: Group description
   *                         example: "Our family group chat"
   *                       participants:
   *                         type: number
   *                         description: Number of participants
   *                         example: 5
   *                       isAdmin:
   *                         type: boolean
   *                         description: Whether bot is admin of the group
   *                         example: false
   *             examples:
   *               groups_response:
   *                 summary: Example groups response
   *                 value:
   *                   success: true
   *                   groups:
   *                     - id: "1234567890-1234567890@g.us"
   *                       name: "Family Chat"
   *                       description: "Our family group chat"
   *                       participants: 5
   *                       isAdmin: false
   *                     - id: "0987654321-0987654321@g.us"
   *                       name: "Work Team"
   *                       description: "Team collaboration group"
   *                       participants: 12
   *                       isAdmin: true
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
       500:
         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/get-groups",
    botProxyController.getGroups.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/pending:
   *   post:
   *     summary: Send pending message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a pending status message to notify about a pending request
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               discorduserid:
   *                 type: string
   *                 description: Discord user ID (alternative to phoneNumber)
   *                 example: "123456789012345678"
   *               phoneNumber:
   *                 type: string
   *                 description: Phone number (alternative to discorduserid)
   *                 example: "+1234567890"
   *               message:
   *                 type: string
   *                 description: Custom pending message content
   *                 example: "Your request is being processed. Please wait..."
   *               requestId:
   *                 type: string
   *                 description: Optional request ID for tracking
   *                 example: "REQ-2025-001"
   *               estimatedTime:
   *                 type: string
   *                 description: Estimated processing time
   *                 example: "5-10 minutes"
   *           examples:
   *             basic_pending:
   *               summary: Basic pending message
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "Your request is being processed. Please wait..."
   *             detailed_pending:
   *               summary: Detailed pending with tracking
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "Your order is being prepared. Tracking ID: REQ-2025-001"
   *                 requestId: "REQ-2025-001"
   *                 estimatedTime: "15 minutes"
   *             discord_pending:
   *               summary: Discord pending notification
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 discorduserid: "123456789012345678"
   *                 message: "Your Discord bot request is pending approval."
   *     responses:
   *       200:
   *         description: Pending message sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 messageId:
   *                   type: string
   *                   example: "msg_1234567890"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-07-02T22:50:00Z"
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/pending",
    botProxyController.sendPendingMessage.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/followup:
   *   post:
   *     summary: Send followup message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a followup message for previous interactions or requests
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               discorduserid:
   *                 type: string
   *                 description: Discord user ID (alternative to phoneNumber)
   *                 example: "123456789012345678"
   *               phoneNumber:
   *                 type: string
   *                 description: Phone number (alternative to discorduserid)
   *                 example: "+1234567890"
   *               message:
   *                 type: string
   *                 description: Followup message content
   *                 example: "Following up on your previous request"
   *               originalRequestId:
   *                 type: string
   *                 description: Reference to the original request
   *                 example: "REQ-2025-001"
   *               priority:
   *                 type: string
   *                 enum: [low, normal, high, urgent]
   *                 description: Priority level of the followup
   *                 example: "normal"
   *               followupType:
   *                 type: string
   *                 enum: [reminder, update, completion, escalation]
   *                 description: Type of followup message
   *                 example: "reminder"
   *           examples:
   *             simple_followup:
   *               summary: Simple followup reminder
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "Just following up on your request from yesterday. Do you need any assistance?"
   *             detailed_followup:
   *               summary: Detailed followup with tracking
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "Update on REQ-2025-001: Your order has been processed and will ship tomorrow."
   *                 originalRequestId: "REQ-2025-001"
   *                 priority: "high"
   *                 followupType: "update"
   *             urgent_followup:
   *               summary: Urgent followup escalation
   *               value:
   *                 botId: "whatsapp-bot-1234567890"
   *                 phoneNumber: "+1234567890"
   *                 message: "URGENT: Your immediate attention is required for request REQ-2025-002"
   *                 originalRequestId: "REQ-2025-002"
   *                 priority: "urgent"
   *                 followupType: "escalation"
   *     responses:
   *       200:
   *         description: Followup message sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 messageId:
   *                   type: string
   *                   example: "msg_followup_1234567890"
   *                 followupId:
   *                   type: string
   *                   example: "followup_1234567890"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-07-02T22:55:00Z"
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/followup",
    botProxyController.sendFollowupMessage.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/receive-image-and-json:
   *   post:
   *     summary: Send image with JSON data
   *     tags: [Bot Proxy - Messaging]
   *     description: Send an image with accompanying JSON data
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               discorduserid:
   *                 type: string
   *                 description: Discord user ID (alternative to phoneNumber)
   *                 example: "123456789012345678"
   *               phoneNumber:
   *                 type: string
   *                 description: Phone number (alternative to discorduserid)
   *                 example: "+1234567890"
   *               imageUrl:
   *                 type: string
   *                 description: URL of the image to send
   *                 example: "https://example.com/image.jpg"
   *               data:
   *                 type: object
   *                 description: Additional JSON data
   *                 properties:
   *                   name:
   *                     type: string
   *                     example: "John Doe"
   *     responses:
   *       200:
   *         description: Message sent successfully
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/receive-image-and-json",
    botProxyController.receiveImageAndJson.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/confirmation:
   *   post:
   *     summary: Send confirmation message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a personalized confirmation message
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [botId, message]
   *             properties:
   *               botId:
   *                 type: string
   *                 description: Unique bot identifier
   *                 example: "whatsapp-bot-1234567890"
   *               discorduserid:
   *                 type: string
   *                 description: Discord user ID (alternative to phoneNumber)
   *                 example: "123456789012345678"
   *               phoneNumber:
   *                 type: string
   *                 description: Phone number (alternative to discorduserid)
   *                 example: "+1234567890"
   *               message:
   *                 type: string
   *                 description: Confirmation message
   *                 example: "Your confirmation message"
   *     responses:
   *       200:
   *         description: Message sent successfully
   *       400:
   *         description: Bot ID and message are required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post(
    "/api/bots/confirmation",
    botProxyController.sendConfirmationMessage.bind(botProxyController)
  );
}
