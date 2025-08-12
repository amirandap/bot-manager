/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";
import { sendToGroups } from "../controllers/MessageHandlerController";
import { MessageErrorHandler, botLogger } from "../utils";
import { SendMessageRequestBody } from "../types/types";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /send-to-group
 * Send message to WhatsApp group(s)
 *
 * Body:
 * - groupId: string | string[] (required) - WhatsApp group ID(s) ending in @g.us
 * - message: string (required)
 *
 * File: Optional attachment
 */
router.post("/", upload.single("file"), async (req, res) => {
  const requestId = Date.now();
  const client = getClient();

  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    botLogger.info(`Group message request ${requestId} received`);

    const { groupId, message } = req.body as SendMessageRequestBody & {
      groupId: string | string[];
    };
    const file = req.file;

    // Validation
    if (!groupId || (!Array.isArray(groupId) && typeof groupId !== "string")) {
      botLogger.error(`Request ${requestId}: groupId is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: groupId is required (string or array)",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (!message || typeof message !== "string") {
      botLogger.error(`Request ${requestId}: message is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: message is required (string)",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Normalize groupId to array
    const groupIds = Array.isArray(groupId) ? groupId : [groupId];

    // Validate all recipients are groups
    const invalidRecipients = groupIds.filter((id) => !id.includes("@g.us"));
    if (invalidRecipients.length > 0) {
      botLogger.error(
        `Request ${requestId}: Invalid group IDs detected`
      );
      return res.status(400).json({
        success: false,
        error:
          "VALIDATION_ERROR: All groupIds must end with @g.us. Phone numbers not allowed in /send-to-group. Use /send-to-phone instead",
        invalidRecipients,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    botLogger.info(
      `Request ${requestId}: Sending to ${groupIds.length} group(s)`
    );

    // Send messages using MessageHandlerController
    const results = await sendToGroups(client, groupIds, message, file);

    // Send error report if needed
    if (results.errors.length > 0) {
      // Transform errors to match expected format
      const transformedErrors = results.errors.map((error) => ({
        recipient: error.recipient, // Use recipient instead of phoneNumber
        error: error.error,
        errorType: error.errorType,
        timestamp: error.timestamp,
      }));
      await MessageErrorHandler.sendErrorReport(
        client,
        req.body,
        transformedErrors,
        "/send-to-group"
      );
    }

    const statusCode =
      results.errors.length === 0
        ? 200
        : results.messagesSent.length === 0
        ? 500
        : 207; // 207 = Multi-Status

    botLogger.success(
      `Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
    );

    return res.status(statusCode).json({
      success: results.errors.length === 0,
      messagesSent: results.messagesSent,
      errors: results.errors,
      totalSent: results.messagesSent.length,
      totalErrors: results.errors.length,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    botLogger.error(`Request ${requestId} failed: ${error}`);

    const { errorType, errorDetails } =
      await MessageErrorHandler.handleCriticalError(
        client,
        error,
        req.body,
        "/send-to-group"
      );

    return res.status(500).json({
      success: false,
      error: "GROUP_SEND_ERROR: Internal server error",
      errorType,
      details: errorDetails.troubleshooting,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
