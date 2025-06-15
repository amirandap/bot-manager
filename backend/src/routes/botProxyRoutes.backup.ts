import { Router } from "express";
import multer from "multer";
import { BotProxyController } from "../controllers/botProxyController";

const router = Router();
const botProxyController = new BotProxyController();

// Configure multer for handling multipart/form-data
const upload = multer(); // No storage configuration needed for in-memory parsing

export function setBotProxyRoutes(app: Router) {
  // ===== ALWAYS AVAILABLE ENDPOINTS =====

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
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Bot not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Bot not responding or server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/bots/status",
    botProxyController.getBotStatus.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/qr-code:
   *   get:
   *     summary: Get QR code for WhatsApp authentication
   *     tags: [Bot Proxy - Core]
   *     description: Get HTML page with QR code for WhatsApp authentication
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     responses:
   *       200:
   *         description: QR code page
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *               description: HTML page with QR code image and refresh button
   *       404:
   *         description: Bot not found or QR code not available
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *   post:
   *     summary: Update QR code (internal use)
   *     tags: [Bot Proxy - Core]
   *     description: Internal endpoint for updating QR code
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               qrCode:
   *                 type: string
   *                 description: Base64 encoded QR code
   *     responses:
   *       200:
   *         description: QR code updated successfully
   */
  app.get(
    "/api/bots/:id/qr-code",
    botProxyController.getBotQRCode.bind(botProxyController)
  );
  app.post(
    "/api/bots/:id/qr-code",
    botProxyController.updateBotQRCode.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/restart:
   *   post:
   *     summary: Restart bot process
   *     tags: [Bot Proxy - Core]
   *     description: Restart the bot process (will cause temporary downtime)
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     responses:
   *       200:
   *         description: Bot restart initiated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Bot is restarting..."
   */
  app.post(
    "/api/bots/:id/restart",
    botProxyController.restartBot.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/change-fallback-number:
   *   post:
   *     summary: Change fallback phone number
   *     tags: [Bot Proxy - Core]
   *     description: Update the fallback phone number for the bot
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [newFallbackNumber]
   *             properties:
   *               newFallbackNumber:
   *                 type: string
   *                 description: New fallback phone number
   *                 example: "+1234567890"
   *     responses:
   *       200:
   *         description: Fallback number updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Fallback number updated successfully"
   *                 fallbackNumber:
   *                   type: string
   *                   example: "+1234567890"
   */
  app.post(
    "/api/bots/:id/change-fallback-number",
    botProxyController.changeFallbackNumber.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/change-port:
   *   post:
   *     summary: Change bot port
   *     tags: [Bot Proxy - Core]
   *     description: Change the port number for the bot (will restart the bot)
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [newPort]
   *             properties:
   *               newPort:
   *                 type: number
   *                 description: New port number
   *                 example: 3001
   *     responses:
   *       200:
   *         description: Port change initiated (bot will restart)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Server port will change to 3001. Restarting..."
   */
  app.post(
    "/api/bots/:id/change-port",
    botProxyController.changePort.bind(botProxyController)
  );

  // ===== WHATSAPP CLIENT READY ENDPOINTS =====

  /**
   * @swagger
   * /api/bots/{id}/send-message:
   *   post:
   *     summary: Send WhatsApp message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a WhatsApp message through the bot with optional file attachment
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [message]
   *             properties:
   *               phoneNumber:
   *                 oneOf:
   *                   - type: string
   *                   - type: array
   *                     items:
   *                       type: string
   *                 description: Phone number(s) to send message to
   *                 example: "+1234567890"
   *               message:
   *                 type: string
   *                 description: Message content to send
   *                 example: "Hello, this is a test message!"
   *               group_id:
   *                 type: string
   *                 description: WhatsApp group ID (alternative to phoneNumber)
   *                 example: "1234567890@g.us"
   *               group_name:
   *                 type: string
   *                 description: WhatsApp group name
   *                 example: "My Test Group"
   *               discorduserid:
   *                 type: string
   *                 description: Discord user ID for phone number resolution
   *                 example: "123456789012345678"
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Optional file attachment
   *     responses:
   *       200:
   *         description: Message sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sent:
   *                   type: array
   *                   items:
   *                     type: string
   *                   description: Successfully sent phone numbers
   *                 errors:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       phoneNumber:
   *                         type: string
   *                       error:
   *                         type: string
   *                   description: Failed phone numbers with error details
   */
  app.post(
    "/api/bots/:id/send-message",
    upload.single("file"),
    botProxyController.sendMessage.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/get-groups:
   *   get:
   *     summary: Get WhatsApp groups
   *     tags: [Bot Proxy - Messaging]
   *     description: Get all WhatsApp groups the bot is a member of
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     responses:
   *       200:
   *         description: Groups retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 groups:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/WhatsAppGroupInfo'
   */
  app.get(
    "/api/bots/:id/get-groups",
    botProxyController.getGroups.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/pending:
   *   post:
   *     summary: Send pending message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a message using Discord user ID for phone number resolution
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [discorduserid, message]
   *             properties:
   *               discorduserid:
   *                 type: string
   *                 description: Discord user ID
   *                 example: "123456789012345678"
   *               message:
   *                 type: string
   *                 description: Message to send
   *                 example: "Your pending message"
   *     responses:
   *       200:
   *         description: Message sent successfully
   */
  app.post(
    "/api/bots/:id/pending",
    botProxyController.sendPendingMessage.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/followup:
   *   post:
   *     summary: Send followup message with image
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a race followup message with congratulations image
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [participant]
   *             properties:
   *               participant:
   *                 type: object
   *                 required: [phone, image, rank, name]
   *                 properties:
   *                   phone:
   *                     type: string
   *                     example: "+1234567890"
   *                   image:
   *                     type: string
   *                     description: Base64 encoded image or image URL
   *                   rank:
   *                     type: string
   *                     example: "1"
   *                   name:
   *                     type: string
   *                     example: "John Doe"
   *     responses:
   *       200:
   *         description: Message sent successfully
   */
  app.post(
    "/api/bots/:id/followup",
    botProxyController.sendFollowupMessage.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/receive-image-and-json:
   *   post:
   *     summary: Send image with JSON data
   *     tags: [Bot Proxy - Messaging]
   *     description: Send an image with participant data and congratulations message
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [participant]
   *             properties:
   *               participant:
   *                 type: object
   *                 required: [phone, image, rank, name]
   *                 properties:
   *                   phone:
   *                     type: string
   *                     example: "+1234567890"
   *                   image:
   *                     type: string
   *                     description: Base64 encoded image or image URL
   *                   rank:
   *                     type: string
   *                     example: "1"
   *                   name:
   *                     type: string
   *                     example: "John Doe"
   *     responses:
   *       200:
   *         description: Message sent successfully
   */
  app.post(
    "/api/bots/:id/receive-image-and-json",
    botProxyController.receiveImageAndJson.bind(botProxyController)
  );

  /**
   * @swagger
   * /api/bots/{id}/confirmation:
   *   post:
   *     summary: Send confirmation message
   *     tags: [Bot Proxy - Messaging]
   *     description: Send a personalized confirmation message
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [message]
   *             properties:
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
   */
  app.post(
    "/api/bots/:id/confirmation",
    botProxyController.sendConfirmationMessage.bind(botProxyController)
  );
}
