/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { client } from "../config/whatsAppClient";
import { sendVideoMessage } from "../helpers/mediaHelpers.js";
import ErrorHandler from "./sendMessage/errorHandler";

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 64 * 1024 * 1024, // 64MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Accept video files
    const allowedMimes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only video files allowed: ${allowedMimes.join(', ')}`));
    }
  }
});

/**
 * POST /send-video
 * Send video message to phone number(s) or group(s)
 * 
 * Body (multipart/form-data):
 * - to: string | string[] (phone numbers and/or group IDs)
 * - message?: string (optional caption)
 * - file: video file (required)
 */
router.post("/", upload.single("file"), async (req, res) => {
  const requestId = Date.now();
  
  try {
    console.log(`🎬 [BOT] Video message request ${requestId} received`);
    
    const { to, message } = req.body;
    const file = req.file;

    // Validation
    if (!file) {
      console.error(`❌ [BOT] Request ${requestId}: Video file is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: Video file is required",
        acceptedTypes: ["video/mp4", "video/avi", "video/mov", "video/wmv", "video/flv", "video/webm", "video/mkv"],
        maxSize: "64MB",
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    if (!to) {
      console.error(`❌ [BOT] Request ${requestId}: 'to' field is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: 'to' field is required (phone numbers or group IDs)",
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Normalize recipients to array
    const recipients = Array.isArray(to) ? to : [to];
    const caption = message || '';

    console.log(`🎬 [BOT] Request ${requestId}: Sending video to ${recipients.length} recipient(s)`);
    console.log(`📁 [BOT] File info: ${file.originalname} (${file.mimetype}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Send video messages
    const results = await sendVideoMessage(
      client,
      recipients,
      file,
      caption
    );

    // Send error report if needed
    if (results.errors.length > 0) {
      await ErrorHandler.sendErrorReport(client, req.body, results.errors);
    }

    const statusCode = results.errors.length === 0 ? 200 : 
                      results.messagesSent.length === 0 ? 500 : 207; // 207 = Multi-Status

    console.log(`✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`);

    return res.status(statusCode).json({
      success: results.errors.length === 0,
      messagesSent: results.messagesSent,
      errors: results.errors,
      totalSent: results.messagesSent.length,
      totalErrors: results.errors.length,
      fileInfo: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error(`❌ [BOT] Request ${requestId} failed:`, error);
    
    const { errorType, errorDetails } = await ErrorHandler.handleCriticalError(
      client,
      error,
      req.body
    );
    
    return res.status(500).json({
      success: false,
      error: "VIDEO_SEND_ERROR: Internal server error",
      errorType,
      details: errorDetails.error,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
