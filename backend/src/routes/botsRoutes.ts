import { Router } from "express";
import multer from "multer";
import { BotsController } from "../controllers/botsController";

const router = Router();
const botsController = new BotsController();

// Configure multer for handling multipart/form-data
const upload = multer(); // No storage configuration needed for in-memory parsing

export function setBotsRoutes(app: Router) {
  /**
   * @swagger
   * /api/bots:
   *   get:
   *     summary: Get all bots
   *     tags: [Bots]
   *     description: Retrieve a list of all configured bots
   *     responses:
   *       200:
   *         description: List of bots
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Bot'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/bots", botsController.getAllBots.bind(botsController));

  // ===== BOT TEMPLATE CONFIGURATION ROUTES =====

  /**
   * @swagger
   * /api/bots/template:
   *   get:
   *     summary: Get bot template configuration
   *     tags: [Bot Template]
   *     description: Retrieve the current bot template configuration used for spawning new bots
   *     responses:
   *       200:
   *         description: Current bot template configuration
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/bots/template",
    botsController.getBotTemplate.bind(botsController)
  );

  /**
   * @swagger
   * /api/bots/template:
   *   put:
   *     summary: Update bot template configuration
   *     tags: [Bot Template]
   *     description: Update a specific configuration value in the bot template
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - configPath
   *               - value
   *             properties:
   *               configPath:
   *                 type: string
   *                 description: Dot-notation path to the configuration (e.g., "pm2Config.memory.maxMemoryRestart")
   *                 example: "pm2Config.memory.maxMemoryRestart"
   *               value:
   *                 description: New value for the configuration
   *                 example: "512M"
   *     responses:
   *       200:
   *         description: Configuration updated successfully
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Server error
   */
  app.put(
    "/api/bots/template",
    botsController.updateBotTemplate.bind(botsController)
  );

  /**
   * @swagger
   * /api/bots/template/memory:
   *   post:
   *     summary: Update memory configuration for all bots
   *     tags: [Bot Template]
   *     description: Update memory-related configurations for all bots
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - maxMemoryRestart
   *               - nodeMaxOldSpace
   *             properties:
   *               maxMemoryRestart:
   *                 type: string
   *                 description: PM2 memory restart threshold
   *                 example: "512M"
   *               nodeMaxOldSpace:
   *                 type: number
   *                 description: Node.js max old space size in MB
   *                 example: 384
   *     responses:
   *       200:
   *         description: Memory configuration updated successfully
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/bots/template/memory",
    botsController.updateMemoryConfig.bind(botsController)
  );

  /**
   * @swagger
   * /api/bots/template/apply:
   *   post:
   *     summary: Apply template to all existing bots
   *     tags: [Bot Template]
   *     description: Apply the current template configuration to all existing bots (requires restart)
   *     responses:
   *       200:
   *         description: Template applied successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 restartedBots:
   *                   type: array
   *                   items:
   *                     type: string
   *                 count:
   *                   type: number
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/bots/template/apply",
    botsController.applyTemplateToAllBots.bind(botsController)
  );

  /**
   * @swagger
   * /api/bots/template/reload:
   *   post:
   *     summary: Reload template configuration from file
   *     tags: [Bot Template]
   *     description: Reload the bot template configuration from the JSON file
   *     responses:
   *       200:
   *         description: Template reloaded successfully
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/bots/template/reload",
    botsController.reloadBotTemplate.bind(botsController)
  );

  // Get bot by ID
  app.get("/api/bots/:id", botsController.getBotById.bind(botsController));

  // Create a new bot configuration
  app.post("/api/bots", botsController.createBot.bind(botsController));

  // Update a bot
  app.put("/api/bots/:id", botsController.updateBot.bind(botsController));

  // Delete a bot
  app.delete("/api/bots/:id", botsController.deleteBot.bind(botsController));

  // ===== NEW BOT SPAWNING ROUTES =====

  /**
   * @swagger
   * /api/bots/spawn/whatsapp:
   *   post:
   *     summary: Spawn new WhatsApp bot
   *     tags: [Bot Spawning]
   *     description: Create and start a new WhatsApp bot instance with PM2
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, apiPort]
   *             properties:
   *               name:
   *                 type: string
   *                 description: Bot display name
   *                 example: "My WhatsApp Bot"
   *               apiPort:
   *                 type: number
   *                 description: Port for bot API server
   *                 example: 3000
   *               apiHost:
   *                 type: string
   *                 description: Host for bot API server
   *                 example: "localhost"
   *                 default: "localhost"
   *     responses:
   *       201:
   *         description: Bot spawned successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "WhatsApp bot spawned successfully"
   *                 bot:
   *                   $ref: '#/components/schemas/Bot'
   *       400:
   *         description: Bad request - invalid parameters or port conflict
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post(
    "/api/bots/spawn/whatsapp",
    botsController.spawnWhatsAppBot.bind(botsController)
  );

  // Start existing bot (PM2 start)
  app.post("/api/bots/:id/start", botsController.spawnBot.bind(botsController));

  // Stop existing bot (PM2 stop)
  app.post("/api/bots/:id/stop", botsController.killBot.bind(botsController));

  // Restart existing bot (PM2 restart)
  app.post(
    "/api/bots/:id/restart",
    botsController.restartBot.bind(botsController)
  );

  // Get bot synchronization status (config vs PM2)
  app.get(
    "/api/bots/sync/status",
    botsController.getBotSync.bind(botsController)
  );

  // ===== PM2 MANAGEMENT ROUTES =====

  /**
   * @swagger
   * /api/bots/{id}/pm2/restart:
   *   post:
   *     summary: Restart bot PM2 service
   *     tags: [PM2 Management]
   *     description: Restart the PM2 service for a specific bot
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     responses:
   *       200:
   *         description: PM2 service restarted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "PM2 service wabot-3000 restarted successfully"
   *                 result:
   *                   type: object
   *       400:
   *         description: Bad request - external bot or no PM2 service
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
   */
  app.post(
    "/api/bots/:id/pm2/restart",
    botsController.restartBotPM2.bind(botsController)
  );

  /**
   * @swagger
   * /api/bots/{id}/pm2/recreate:
   *   post:
   *     summary: Recreate bot PM2 service
   *     tags: [PM2 Management]
   *     description: Stop, delete, and recreate the PM2 service for a specific bot
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     responses:
   *       200:
   *         description: PM2 service recreated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "PM2 service recreated successfully"
   *                 result:
   *                   type: object
   *       400:
   *         description: Bad request - external bot
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
   */
  app.post(
    "/api/bots/:id/pm2/recreate",
    botsController.recreateBotPM2.bind(botsController)
  );

  /**
   * @swagger
   * /api/bots/{id}/pm2/status:
   *   get:
   *     summary: Get bot PM2 status
   *     tags: [PM2 Management]
   *     description: Get detailed PM2 process status for a specific bot
   *     parameters:
   *       - $ref: '#/components/parameters/BotId'
   *     responses:
   *       200:
   *         description: PM2 status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PM2Status'
   *       404:
   *         description: Bot not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get(
    "/api/bots/:id/pm2/status",
    botsController.getBotPM2Status.bind(botsController)
  );
}
