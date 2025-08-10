/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";
import { sendToPhones } from "../utils/messageHandler";
import { MessageErrorHandler } from "../utils/errorHandler";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  const requestId = Date.now().toString(36);
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

    const { phoneNumber, message } = req.body;
    const file = req.file;

    // Validation
    if (
      !phoneNumber ||
      (!Array.isArray(phoneNumber) && typeof phoneNumber !== "string")
    ) {
      console.error(`❌ [BOT] Request ${requestId}: phoneNumber is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: phoneNumber is required (string or array)",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (!message || typeof message !== "string") {
      console.error(`❌ [BOT] Request ${requestId}: message is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: message is required (string)",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Normalize phoneNumber to array
    const phoneNumbers = Array.isArray(phoneNumber)
      ? phoneNumber
      : [phoneNumber];

    // Validate no groups in phone numbers
    const invalidRecipients = phoneNumbers.filter((num: string) =>
      num.includes("@g.us")
    );
    if (invalidRecipients.length > 0) {
      console.error(
        `❌ [BOT] Request ${requestId}: Group IDs not allowed in phone endpoint`
      );
      return res.status(400).json({
        success: false,
        error:
          "VALIDATION_ERROR: Group IDs not allowed in /send-to-phone. Use /send-to-group instead",
        invalidRecipients,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `📱 [BOT] Request ${requestId}: Sending to ${phoneNumbers.length} phone(s)`
    );

    // Use messageHandler for consistent error handling
    const results = await sendToPhones(client, phoneNumbers, message, file);

    // Send error report if needed
    if (results.errors.length > 0) {
      await MessageErrorHandler.sendErrorReport(
        client,
        req.body,
        results.errors,
        "/send-to-phone"
      );
    }

    const statusCode =
      results.errors.length === 0
        ? 200
        : results.messagesSent.length === 0
        ? 500
        : 207; // 207 = Multi-Status

    console.log(
      `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
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
    console.error(`❌ [BOT] Request ${requestId} failed:`, error);

    const { errorType, errorDetails } =
      await MessageErrorHandler.handleCriticalError(
        client,
        error,
        req.body,
        "/send-to-phone"
      );

    return res.status(500).json({
      success: false,
      error: "PHONE_SEND_ERROR: Internal server error",
      errorType,
      details: errorDetails.troubleshooting,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
