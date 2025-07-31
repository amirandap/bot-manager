/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { client } from "../config/whatsAppClient";
import GroupMessageHandler from "./sendMessage/groupMessageHandler";
import PhoneMessageHandler from "./sendMessage/phoneMessageHandler";
import ErrorHandler from "./sendMessage/errorHandler";
import { SendMessageRequestBody } from "./sendMessage/types";

const router = express.Router();
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
  
  try {
    console.log(`📢 [BOT] Broadcast message request ${requestId} received`);
    
    const { to, message } = req.body as SendMessageRequestBody & { to: string[] };
    const file = req.file;

    // Validation
    if (!to || !Array.isArray(to) || to.length === 0) {
      console.error(`❌ [BOT] Request ${requestId}: to array is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: to is required (non-empty array)",
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

    // Separate groups and phone numbers
    const groups = to.filter(recipient => recipient.includes('@g.us'));
    const phoneNumbers = to.filter(recipient => !recipient.includes('@g.us'));
    
    console.log(`📢 [BOT] Request ${requestId}: Broadcasting to ${phoneNumbers.length} phone(s) + ${groups.length} group(s)`);

    // Send to groups
    const groupResults = await GroupMessageHandler.sendToGroups(
      client,
      groups,
      message,
      file
    );

    // Send to phone numbers
    const phoneResults = await PhoneMessageHandler.sendToPhones(
      client,
      phoneNumbers,
      message,
      file
    );

    // Combine results
    const allMessagesSent = [...groupResults.messagesSent, ...phoneResults.messagesSent];
    const allErrors = [...groupResults.errors, ...phoneResults.errors];

    // Send error report if needed
    if (allErrors.length > 0) {
      await ErrorHandler.sendErrorReport(client, req.body, allErrors);
    }

    const statusCode = allErrors.length === 0 ? 200 : 
                      allMessagesSent.length === 0 ? 500 : 207; // 207 = Multi-Status

    console.log(`✅ [BOT] Request ${requestId} completed: ${allMessagesSent.length} sent, ${allErrors.length} errors`);

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
        groupErrors: groupResults.errors.length
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
      error: "BROADCAST_SEND_ERROR: Internal server error",
      errorType,
      details: errorDetails.error,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
