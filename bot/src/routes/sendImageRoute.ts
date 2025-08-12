/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";
import { sendImageMessage } from "../services/MediaMessagingService";
import { MessageErrorHandler } from "../utils/errorHandler";
import RequestValidator from "../utils/requestValidator";
import { RecipientProcessor } from "../utils/recipientFormatting";
import { botLogger } from "../utils/loggerWrapper";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type. Only images allowed: ${allowedMimes.join(", ")}`
        )
      );
    }
  },
});

/**
 * POST /send-image
 * Send image message to phone number(s) or group(s)
 *
 * Body (multipart/form-data):
 * - to: string | string[] (phone numbers and/or group IDs)
 * - message?: string (optional caption)
 * - file: image file (required)
 */
router.post("/", upload.single("file"), async (req, res) => {
  const requestId = Date.now();
  const client = getClient();

  if (!client) {
    return res.status(503).json({
      success: false,
      error: "WhatsApp client not ready",
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    botLogger.info(`🖼️ [BOT] Image message request ${requestId} received`);

    // Validate file upload
    const fileValidation = RequestValidator.validateFileUpload(
      req,
      res,
      "Image",
      ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    );
    if (!fileValidation.isValid) return;

    // Validate recipients
    const recipientValidation = RequestValidator.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const { to, message } = req.body;
    const file = fileValidation.file!; // Safe to use ! because validation passed

    // Process recipients
    const { groups, phoneNumbers } =
      RecipientProcessor.processSimpleRecipients(to);
    const recipients = [...groups, ...phoneNumbers];
    const caption = message || "";

    botLogger.info(
      `🖼️ [BOT] Request ${requestId}: Sending image to ${recipients.length} recipient(s)`
    );
    botLogger.info(
      `📁 [BOT] File info: ${file.originalname} (${file.mimetype}, ${(
        file.size / 1024
      ).toFixed(2)}KB)`
    );

    // Send image messages
    const results = await sendImageMessage(client, recipients, file, caption);

    // Send error report if needed
    if (results.errors.length > 0) {
      await MessageErrorHandler.sendErrorReport(
        client,
        req.body,
        results.errors,
        "/send-image"
      );
    }

    const statusCode = RequestValidator.getResponseStatus(
      results.errors,
      results.messagesSent
    );
    const response = RequestValidator.buildResponse(
      results.messagesSent,
      results.errors
    );

    botLogger.success(
      `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
    );

    return res.status(statusCode).json({
      ...response,
      fileInfo: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    botLogger.error(`❌ [BOT] Request ${requestId} failed: ${error}`);

    const { errorType, errorDetails } =
      await MessageErrorHandler.handleCriticalError(
        client,
        error,
        req.body,
        "/send-image"
      );

    return res.status(500).json({
      success: false,
      error: "IMAGE_SEND_ERROR: Internal server error",
      errorType,
      details: errorDetails.troubleshooting,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
