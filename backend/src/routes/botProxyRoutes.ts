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
  app.post("/api/bots/status", botProxyController.getBotStatus.bind(botProxyController));

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
  app.post("/api/bots/qr-code", botProxyController.getBotQRCode.bind(botProxyController));

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
  app.post("/api/bots/qr-code/update", botProxyController.updateBotQRCode.bind(botProxyController));

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
  app.post("/api/bots/restart", botProxyController.restartBot.bind(botProxyController));

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
  app.post("/api/bots/change-fallback-number", botProxyController.changeFallbackNumber.bind(botProxyController));

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
  app.post("/api/bots/change-port", botProxyController.changePort.bind(botProxyController));

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
   *                 type: string
   *                 description: Recipient phone number with country code
   *                 example: "+1234567890"
   *               message:
   *                 type: string
   *                 description: Message content
   *                 example: "Hello from WhatsApp Bot!"
   *     responses:
   *       200:
   *         description: Message sent successfully
   *       400:
   *         description: Bot ID, phone number, and message are required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post("/api/bots/send-message", upload.single("file"), botProxyController.sendMessage.bind(botProxyController));

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
   *     responses:
   *       200:
   *         description: Groups retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                     description: Group ID
   *                   name:
   *                     type: string
   *                     description: Group name
   *       400:
   *         description: Bot ID is required
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Bot not responding or server error
   */
  app.post("/api/bots/get-groups", botProxyController.getGroups.bind(botProxyController));

  /**
   * @swagger
   * /api/bots/pending:
   *   post:
   *     summary: Send pending message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a pending status message
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
   *                 description: Pending message content
   *                 example: "Your request is pending"
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
  app.post("/api/bots/pending", botProxyController.sendPendingMessage.bind(botProxyController));

  /**
   * @swagger
   * /api/bots/followup:
   *   post:
   *     summary: Send followup message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a followup message
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
   *                 example: "Following up on your request"
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
  app.post("/api/bots/followup", botProxyController.sendFollowupMessage.bind(botProxyController));

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
  app.post("/api/bots/receive-image-and-json", botProxyController.receiveImageAndJson.bind(botProxyController));

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
  app.post("/api/bots/confirmation", botProxyController.sendConfirmationMessage.bind(botProxyController));
}
