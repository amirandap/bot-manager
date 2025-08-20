import express from 'express';
import { MessageMonitoringController } from '../controllers/messageMonitoringController';

const router = express.Router();
const messageMonitoringController = new MessageMonitoringController();

/**
 * @swagger
 * tags:
 *   name: Message Monitoring
 *   description: Monitor message processing and backend communication
 */

/**
 * @swagger
 * /api/monitoring/messages:
 *   get:
 *     summary: Get message processing logs
 *     tags: [Message Monitoring]
 *     parameters:
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
 *         description: Number of lines to skip from the end
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [received, sent, failed, processing, error]
 *         description: Filter logs by message type
 *     responses:
 *       200:
 *         description: Message logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MessageLog'
 *                     total:
 *                       type: integer
 *                       description: Total number of message logs
 *                     hasMore:
 *                       type: boolean
 *                       description: Whether there are more logs available
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/messages', messageMonitoringController.getMessageLogs.bind(messageMonitoringController));

/**
 * @swagger
 * /api/monitoring/messages/stats:
 *   get:
 *     summary: Get message processing statistics
 *     tags: [Message Monitoring]
 *     responses:
 *       200:
 *         description: Message statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MessageStats'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/messages/stats', messageMonitoringController.getMessageStats.bind(messageMonitoringController));

/**
 * @swagger
 * /api/monitoring/messages/tail:
 *   get:
 *     summary: Get latest message logs (real-time monitoring)
 *     tags: [Message Monitoring]
 *     parameters:
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
 *           enum: [received, sent, failed, processing, error]
 *         description: Filter logs by message type
 *     responses:
 *       200:
 *         description: Latest message logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MessageLog'
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/messages/tail', messageMonitoringController.getTailLogs.bind(messageMonitoringController));

/**
 * @swagger
 * /api/monitoring/messages/clear:
 *   post:
 *     summary: Clear message logs
 *     tags: [Message Monitoring]
 *     responses:
 *       200:
 *         description: Message logs cleared successfully
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
 *                   example: "Message logs cleared successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.post('/messages/clear', messageMonitoringController.clearMessageLogs.bind(messageMonitoringController));

export default router;
