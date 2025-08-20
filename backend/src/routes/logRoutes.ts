import { Router } from "express";
import { LogController } from "../controllers/logController";

const router = Router();
const logController = new LogController();

export function setLogRoutes(app: Router) {
  /**
   * @swagger
   * /api/logs/{botId}:
   *   get:
   *     summary: Get logs for a specific bot
   *     tags: [Logs]
   *     description: Retrieve logs for a specific bot with pagination support
   *     parameters:
   *       - in: path
   *         name: botId
   *         required: true
   *         schema:
   *           type: string
   *         description: The bot ID
   *       - in: query
   *         name: lines
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Number of log lines to retrieve
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Offset from the end of the log file
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [combined, error, out]
   *           default: combined
   *         description: Type of log file to read
   *     responses:
   *       200:
   *         description: Logs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 botId:
   *                   type: string
   *                 botName:
   *                   type: string
   *                 logs:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       timestamp:
   *                         type: string
   *                       level:
   *                         type: string
   *                       message:
   *                         type: string
   *                       raw:
   *                         type: string
   *                 totalLines:
   *                   type: integer
   *                 hasMore:
   *                   type: boolean
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Server error
   */
  app.get("/api/logs/:botId", logController.getBotLogs.bind(logController));

  /**
   * @swagger
   * /api/logs/{botId}/tail:
   *   get:
   *     summary: Get recent logs for a specific bot
   *     tags: [Logs]
   *     description: Get the most recent logs for a bot (tail -f equivalent)
   *     parameters:
   *       - in: path
   *         name: botId
   *         required: true
   *         schema:
   *           type: string
   *         description: The bot ID
   *       - in: query
   *         name: lines
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Number of recent log lines to retrieve
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [combined, error, out]
   *           default: combined
   *         description: Type of log file to read
   *     responses:
   *       200:
   *         description: Recent logs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   timestamp:
   *                     type: string
   *                   level:
   *                     type: string
   *                   message:
   *                     type: string
   *                   raw:
   *                     type: string
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Server error
   */
  app.get("/api/logs/:botId/tail", logController.getTailLogs.bind(logController));

  /**
   * @swagger
   * /api/logs/{botId}/files:
   *   get:
   *     summary: Get available log files for a bot
   *     tags: [Logs]
   *     description: List all available log files for a specific bot
   *     parameters:
   *       - in: path
   *         name: botId
   *         required: true
   *         schema:
   *           type: string
   *         description: The bot ID
   *     responses:
   *       200:
   *         description: Log files retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: string
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Server error
   */
  app.get("/api/logs/:botId/files", logController.getLogFiles.bind(logController));

  /**
   * @swagger
   * /api/logs/{botId}/stats:
   *   get:
   *     summary: Get log statistics for a bot
   *     tags: [Logs]
   *     description: Get statistics about logs for a specific bot
   *     parameters:
   *       - in: path
   *         name: botId
   *         required: true
   *         schema:
   *           type: string
   *         description: The bot ID
   *     responses:
   *       200:
   *         description: Log statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalLines:
   *                   type: integer
   *                 errorCount:
   *                   type: integer
   *                 warnCount:
   *                   type: integer
   *                 infoCount:
   *                   type: integer
   *                 lastUpdate:
   *                   type: string
   *                 fileSizes:
   *                   type: object
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Server error
   */
  app.get("/api/logs/:botId/stats", logController.getLogStats.bind(logController));

  /**
   * @swagger
   * /api/logs/{botId}/clear:
   *   post:
   *     summary: Clear logs for a specific bot
   *     tags: [Logs]
   *     description: Clear all or specific log files for a bot
   *     parameters:
   *       - in: path
   *         name: botId
   *         required: true
   *         schema:
   *           type: string
   *         description: The bot ID
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [combined, error, out]
   *         description: Type of log file to clear (omit to clear all)
   *     responses:
   *       200:
   *         description: Logs cleared successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       404:
   *         description: Bot not found
   *       500:
   *         description: Server error
   */
  app.post("/api/logs/:botId/clear", logController.clearBotLogs.bind(logController));
}
