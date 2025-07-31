/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { client } from "../config/whatsAppClient";
import PhoneMessageHandler from "./sendMessage/phoneMessageHandler";
import ErrorHandler from "./sendMessage/errorHandler";
import { SendMessageRequestBody } from "./sendMessage/types";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /send-to-phone
 * Send message to individual phone number(s)
 * 
 * Body:
 * - phoneNumber: string | string[] (required)
 * - message: string (required)
 * - discorduserid?: string (optional)
 * 
 * File: Optional attachment
 */
router.post("/", upload.single("file"), async (req, res) => {
  const requestId = Date.now();
  
  try {
    console.log(`📞 [BOT] Phone message request ${requestId} received`);
    
    const { phoneNumber, message, discorduserid } = req.body as SendMessageRequestBody;
    const file = req.file;

    // Validation
    if (!phoneNumber || (!Array.isArray(phoneNumber) && typeof phoneNumber !== 'string')) {
      console.error(`❌ [BOT] Request ${requestId}: phoneNumber is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: phoneNumber is required (string or array)",
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    if (!message || typeof message !== 'string') {
      console.error(`❌ [BOT] Request ${requestId}: message is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: message is required (string)",
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Normalize phoneNumber to array
    const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber];
    
    // Validate no groups in phone numbers
    const invalidRecipients = phoneNumbers.filter(num => num.includes('@g.us'));
    if (invalidRecipients.length > 0) {
      console.error(`❌ [BOT] Request ${requestId}: Group IDs not allowed in phone endpoint`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: Group IDs not allowed in /send-to-phone. Use /send-to-group instead",
        invalidRecipients,
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📱 [BOT] Request ${requestId}: Sending to ${phoneNumbers.length} phone(s)`);

    // Send messages using PhoneMessageHandler
    const results = await PhoneMessageHandler.sendToPhones(
      client,
      phoneNumbers,
      message,
      file
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
      error: "PHONE_SEND_ERROR: Internal server error",
      errorType,
      details: errorDetails.error,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
