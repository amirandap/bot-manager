/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";
import { sendToGroups, sendToPhones } from "../controllers/MessageHandlerController";
import { MessageErrorHandlerService } from "../services";
import { separateRecipients, botLogger } from "../utils";
import { SendMessageRequestBody } from "../types/types";

const router = express.Router();
const messageErrorHandler = new MessageErrorHandlerService();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /send-broadcast
 * Send message to multiple recipients (phones and/or groups)
 *
 * Body:
 * - to: string[] (required) - Array of phone numbers and/or group IDs
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

    botLogger.info(`📢 [BOT] Broadcast message request ${requestId} received`);

    const { to, message } = req.body as SendMessageRequestBody & {
      to: string[];
    };
    const file = req.file;

    // Validation
    if (!to || !Array.isArray(to) || to.length === 0) {
      botLogger.error(`❌ [BOT] Request ${requestId}: to array is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: to is required (non-empty array)",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (!message || typeof message !== "string") {
      botLogger.error(`❌ [BOT] Request ${requestId}: message is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: message is required (string)",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Separate groups and phone numbers
    const { groups, phoneNumbers } = separateRecipients(to);

    botLogger.info(
      `📢 [BOT] Request ${requestId}: Broadcasting to ${phoneNumbers.length} phone(s) + ${groups.length} group(s)`
    );

    // Send to groups and phone numbers using MessageHandlerController
    const groupResults = await sendToGroups(client, groups, message, file);
    const phoneResults = await sendToPhones(
      client,
      phoneNumbers,
      message,
      file
    );

    // Combine results
    const allMessagesSent = [
      ...groupResults.messagesSent,
      ...phoneResults.messagesSent,
    ];
    const allErrors = [...groupResults.errors, ...phoneResults.errors];

    // Send error report if needed
    if (allErrors.length > 0) {
      const transformedErrors = allErrors.map((error) => ({
        error: new Error(error.error),
        context: "/send-broadcast",
        recipient: error.recipient
      }));
      await messageErrorHandler.handleBatchErrors(transformedErrors);
    }

    const statusCode =
      allErrors.length === 0 ? 200 : allMessagesSent.length === 0 ? 500 : 207; // 207 = Multi-Status

    botLogger.success(
      `✅ [BOT] Request ${requestId} completed: ${allMessagesSent.length} sent, ${allErrors.length} errors`
    );

    return res.status(statusCode).json({
      success: allErrors.length === 0,
      messagesSent: allMessagesSent,
      errors: allErrors,
      totalSent: allMessagesSent.length,
      totalErrors: allErrors.length,
      breakdown: {
        phonesSent: phoneResults.messagesSent.length,
        groupsSent: groupResults.messagesSent.length,
        phoneErrors: phoneResults.errors.length,
        groupErrors: groupResults.errors.length,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    botLogger.error(`❌ [BOT] Request ${requestId} failed: ${error}`);

    const errorResult = await messageErrorHandler.handleMessageError(
      error instanceof Error ? error : new Error(String(error)),
      "/send-broadcast",
      undefined,
      "broadcast"
    );

    return res.status(500).json({
      success: false,
      error: "BROADCAST_SEND_ERROR: Internal server error",
      errorType: "CRITICAL_ERROR",
      details: errorResult.errorMessage,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
