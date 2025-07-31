/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { client } from "../config/whatsAppClient";
import GroupMessageHandler from "./sendMessage/groupMessageHandler";
import ErrorHandler from "./sendMessage/errorHandler";
import { SendMessageRequestBody } from "./sendMessage/types";

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
  
  try {
    console.log(`🏢 [BOT] Group message request ${requestId} received`);
    
    const { groupId, message } = req.body as SendMessageRequestBody & { groupId: string | string[] };
    const file = req.file;

    // Validation
    if (!groupId || (!Array.isArray(groupId) && typeof groupId !== 'string')) {
      console.error(`❌ [BOT] Request ${requestId}: groupId is required`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: groupId is required (string or array)",
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

    // Normalize groupId to array
    const groupIds = Array.isArray(groupId) ? groupId : [groupId];
    
    // Validate all recipients are groups
    const invalidRecipients = groupIds.filter(id => !id.includes('@g.us'));
    if (invalidRecipients.length > 0) {
      console.error(`❌ [BOT] Request ${requestId}: Invalid group IDs detected`);
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: All groupIds must end with @g.us. Phone numbers not allowed in /send-to-group. Use /send-to-phone instead",
        invalidRecipients,
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🏢 [BOT] Request ${requestId}: Sending to ${groupIds.length} group(s)`);

    // Send messages using GroupMessageHandler
    const results = await GroupMessageHandler.sendToGroups(
      client,
      groupIds,
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
      error: "GROUP_SEND_ERROR: Internal server error",
      errorType,
      details: errorDetails.error,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
