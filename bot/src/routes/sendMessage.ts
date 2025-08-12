
import { botLogger, formatRecipient, MessageErrorHandler } from "../utils";
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("media"), async (req, res) => {
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

    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: "Phone and message are required",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    botLogger.info(`📱 [BOT] Simple message request ${requestId}: ${phone}`, '💬');

    // Simple message sending
    try {
      const chatId = formatRecipient(phone);
      await client.sendMessage(chatId, message);

      botLogger.info(`✅ [BOT] Request ${requestId} completed successfully`, '✅');

      res.json({
        success: true,
        message: "Message sent successfully",
        to: phone,
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      botLogger.error(`❌ [BOT] Request ${requestId} send error:`);

      // Use the new error handler
      const { errorType, errorDetails } =
        await MessageErrorHandler.handleCriticalError(
          client,
          error,
          req.body,
          "/send-message"
        );

      res.status(500).json({
        success: false,
        error: "Failed to send message",
        errorType,
        details: errorDetails.troubleshooting,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    botLogger.error(`❌ [BOT] Request ${requestId} critical error:`);

    const { errorType, errorDetails } =
      await MessageErrorHandler.handleCriticalError(
        client,
        error,
        req.body,
        "/send-message"
      );

    res.status(500).json({
      success: false,
      error: "Internal server error",
      errorType,
      details: errorDetails.troubleshooting,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
