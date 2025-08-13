/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";
import { sendImageMessage } from "../services/MediaMessagingService";
import { MessageErrorHandlerService } from "../services";
import { botLogger } from "../utils";
import { RequestValidationService } from "../services/RequestValidationService";
import { RecipientProcessorService } from "../services/RecipientProcessorService";

const router = express.Router();
const messageErrorHandler = new MessageErrorHandlerService();
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
    const fileValidation = RequestValidationService.validateFileUpload(
      req,
      res,
      "Image",
      ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    );
    if (!fileValidation.isValid) return;

    // Validate recipients
    const recipientValidation = RequestValidationService.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const { to, message } = req.body;
    const file = fileValidation.file!; // Safe to use ! because validation passed

    // Process recipients
    const { groups, phoneNumbers } =
      RecipientProcessorService.processSimpleRecipients(to);
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
      const transformedErrors = results.errors.map((error) => ({
        error: new Error(error.error),
        context: "/send-image",
        recipient: error.recipient
      }));
      await messageErrorHandler.handleBatchErrors(transformedErrors);
    }

    const statusCode = RequestValidationService.getResponseStatus(
      results.errors,
      results.messagesSent
    );
    const response = RequestValidationService.buildResponse(
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

    const errorResult = await messageErrorHandler.handleMessageError(
      error instanceof Error ? error : new Error(String(error)),
      "/send-image",
      undefined,
      "image"
    );

    return res.status(500).json({
      success: false,
      error: "IMAGE_SEND_ERROR: Internal server error",
      errorType: "CRITICAL_ERROR",
      details: errorResult.errorMessage,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
