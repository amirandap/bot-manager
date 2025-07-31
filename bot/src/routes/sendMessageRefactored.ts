/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable max-len */
import express from "express";
import multer from "multer";
import { client } from "../config/whatsAppClient";
import RecipientProcessor from "./sendMessage/recipientProcessor";
import GroupMessageHandler from "./sendMessage/groupMessageHandler";
import PhoneMessageHandler from "./sendMessage/phoneMessageHandler";
import ErrorHandler from "./sendMessage/errorHandler";
import RequestValidator from "./sendMessage/requestValidator";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    // Validate request
    const validation = RequestValidator.validateRequest(req, res);
    if (!validation.isValid) {
      return; // Response already sent by validator
    }

    const { body, file } = validation;
    const { message } = body!;

    // Process recipients
    const { groups, phoneNumbers } = await RecipientProcessor.processRecipients(body!);

    // Send messages to groups
    const groupResults = await GroupMessageHandler.sendToGroups(
      client,
      groups,
      message,
      file
    );

    // Send messages to individual phone numbers
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
    await ErrorHandler.sendErrorReport(client, body!, allErrors);

    // Build and send response
    const response = RequestValidator.buildResponse(allMessagesSent, allErrors);
    const statusCode = RequestValidator.getResponseStatus(allErrors);

    return res.status(statusCode).send(response);
  } catch (error: unknown) {
    // Handle critical errors
    const { errorType, errorDetails } = await ErrorHandler.handleCriticalError(
      client,
      error,
      req.body
    );
    
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      errorType,
      details: errorDetails.error,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
