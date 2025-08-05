/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  const requestId = Date.now().toString(36);
  
  try {
    const client = getClient();
    
    if (!client) {
      return res.status(503).json({ 
        success: false, 
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    const { phoneNumber, message } = req.body;
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
    const invalidRecipients = phoneNumbers.filter((num: string) => num.includes('@g.us'));
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

    // Send messages
    const messagesSent = [];
    const errors = [];

    for (const phone of phoneNumbers) {
      try {
        const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        
        if (file) {
          // Send file with message - simplified for now
          // TODO: Implement proper file handling with MessageMedia
          await client.sendMessage(chatId, `${message}\n\n[File: ${file.originalname || 'attachment'} - ${file.mimetype}]`);
        } else {
          // Send text message
          await client.sendMessage(chatId, message);
        }
        
        messagesSent.push({
          phone,
          chatId,
          message,
          hasFile: !!file,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ [BOT] Request ${requestId}: Message sent to ${phone}`);
        
      } catch (error) {
        console.error(`❌ [BOT] Request ${requestId}: Error sending to ${phone}:`, error);
        errors.push({
          phone,
          error: error instanceof Error ? error.message : 'Failed to send message',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Send error report to fallback number if there are errors
    if (errors.length > 0) {
      try {
        const fallbackNumber = process.env.FALLBACK_NUMBER;
        if (fallbackNumber) {
          const errorReport = `❌ Error Report - Request ${requestId}\n\n` +
            `Total errors: ${errors.length}\n` +
            `Successful sends: ${messagesSent.length}\n\n` +
            `Errors:\n${errors.map(e => `• ${e.phone}: ${e.error}`).join('\n')}`;
          
          const fallbackChatId = fallbackNumber.includes('@c.us') ? fallbackNumber : `${fallbackNumber}@c.us`;
          await client.sendMessage(fallbackChatId, errorReport);
          console.log(`📋 [BOT] Request ${requestId}: Error report sent to fallback number`);
        }
      } catch (reportError) {
        console.error(`❌ [BOT] Request ${requestId}: Failed to send error report:`, reportError);
      }
    }

    const statusCode = errors.length === 0 ? 200 : 
                      messagesSent.length === 0 ? 500 : 207; // 207 = Multi-Status

    console.log(`✅ [BOT] Request ${requestId} completed: ${messagesSent.length} sent, ${errors.length} errors`);

    return res.status(statusCode).json({
      success: errors.length === 0,
      messagesSent,
      errors,
      totalSent: messagesSent.length,
      totalErrors: errors.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error(`❌ [BOT] Request ${requestId} failed:`, error);
    
    // Try to send critical error report
    try {
      const client = getClient();
      const fallbackNumber = process.env.FALLBACK_NUMBER;
      if (client && fallbackNumber) {
        const criticalErrorReport = `🚨 CRITICAL ERROR - Request ${requestId}\n\n` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
          `Request body: ${JSON.stringify(req.body, null, 2)}`;
        
        const fallbackChatId = fallbackNumber.includes('@c.us') ? fallbackNumber : `${fallbackNumber}@c.us`;
        await client.sendMessage(fallbackChatId, criticalErrorReport);
      }
    } catch (reportError) {
      console.error(`❌ [BOT] Request ${requestId}: Failed to send critical error report:`, reportError);
    }
    
    return res.status(500).json({
      success: false,
      error: "PHONE_SEND_ERROR: Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
