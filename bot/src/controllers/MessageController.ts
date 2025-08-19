
import { logger } from "../services/LoggerService";
import { MessageErrorHandlerService } from "../services";
import { RequestValidationService } from "../services/RequestValidationService";
import { RecipientProcessorService } from "../services/RecipientProcessorService";
import { SessionMonitorService } from "../services/SessionMonitorService";
import { Request, Response } from "express";
import { getClient } from "../config/clientExporter";
import {
  sendToPhones,
  sendToGroups,
  sendMessageWithErrorHandling,
} from "./MessageHandlerController";
import {
  sendImageMessage,
  sendDocumentMessage,
  sendAudioMessage,
  sendVideoMessage,
} from "../services/MediaMessagingService";
import {
  detectMediaType,
  getTextFieldForMediaType,
  validateMediaTypeSupport,
  getFileSizeLimit,
  DetectedMediaType
} from "../utils/mediaTypeDetector";
import {
  SendResponse,
  MediaSendResponse,
} from "../types/types";

// Initialize error handler service
const messageErrorHandler = new MessageErrorHandlerService();

/**
 * Centralized Message Controller - CONSOLIDATED VERSION
 * 
 * ELIMINATES DUPLICATIONS BY USING:
 * - MessageHandlerController for message handling (NOT old messageHandler.ts)
 * - RequestValidationService for validation (NOT internal duplicate methods)
 * - MessageErrorHandler for error handling
 * - Unified client checking (NO duplicate validateClient methods)
 */

export class MessageController {
  /**
   * Unified client validation - eliminates 5 duplicate checks
   */
  private static validateClientAndReturn(res: Response): { client: any; requestId: string } | null {
    const client = getClient();
    const requestId = Date.now().toString(36);
    
    if (!client) {
      res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
    
    return { client, requestId };
  }

  /**
   * Unified response formatting - uses RequestValidationService methods
   */
  private static formatResponse(
    results: { messagesSent: string[]; errors: any[] },
    requestId: string,
    additionalData?: Record<string, any>
  ): { statusCode: number; response: SendResponse | MediaSendResponse } {
    const statusCode = RequestValidationService.getResponseStatus(results.errors, results.messagesSent);

    const response = {
      success: results.errors.length === 0,
      messagesSent: results.messagesSent,
      errors: results.errors,
      totalSent: results.messagesSent.length,
      totalErrors: results.errors.length,
      requestId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    return { statusCode, response };
  }

  /**
   * Unified error handling - uses MessageErrorHandler + Session Recovery
   */
  private static async handleError(
    error: unknown,
    req: Request,
    res: Response,
    endpoint: string,
    requestId: string
  ): Promise<void> {
    logger.error(`❌ [BOT] Request ${requestId} failed:`);

    const errorObj = error as Error;
    
    // Check if this is a recoverable session error
    const sessionMonitor = SessionMonitorService.getInstance();
    if (sessionMonitor.isRecoverableSessionError(errorObj)) {
      logger.info(`🔄 Detected session error, triggering recovery: ${errorObj.message}`);
      
      // Trigger session recovery (async, don't wait)
      sessionMonitor.handleSessionError(errorObj).catch(recoveryError => {
        logger.error(`Session recovery failed: ${recoveryError}`);
      });
    }

    const errorResult = await messageErrorHandler.handleMessageError(
      errorObj,
      endpoint,
      req.body.phoneNumber,
      "critical"
    );

    res.status(500).json({
      success: false,
      error: `${endpoint.toUpperCase().replace(/[^A-Z]/g, "_")}_ERROR: Internal server error`,
      errorType: "CRITICAL_ERROR",
      details: errorResult.errorMessage,
      requestId,
      timestamp: new Date().toISOString(),
      sessionRecovery: sessionMonitor.isRecoverableSessionError(errorObj) ? "recovery_triggered" : "not_applicable"
    });
  }

  /**
   * Send to phone numbers only - consolidated validation
   */
  public static async sendToPhone(req: Request, res: Response): Promise<void> {
    // Unified client validation
    const clientValidation = MessageController.validateClientAndReturn(res);
    if (!clientValidation) return;
    
    const { client, requestId } = clientValidation;

    // Use RequestValidationService - no duplicate validation
    const validation = RequestValidationService.validateMessageRequest(req, res, true);
    if (!validation.isValid) return;

    const recipientValidation = RequestValidationService.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;
    const { message } = validation.body!;
    const file = validation.file;
    
    // Use RecipientProcessorService instead of extractRecipients
    const { phoneNumbers } = await RecipientProcessorService.processRecipients(recipientValidation.body!);
    
    if (phoneNumbers.length === 0) {
      res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: No valid phone numbers found",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      logger.info(`📱 [BOT] Request ${requestId}: Sending to ${phoneNumbers.length} phone(s)`);

      // Use MessageHandlerController - no old messageHandler.ts
      const results = await sendToPhones(client, phoneNumbers, message!, file);

      if (results.errors.length > 0) {
        const errorObjects = results.errors.map(err => ({
          error: new Error(err.error),
          context: "/send-to-phone",
          recipient: err.recipient
        }));
        
        await messageErrorHandler.handleBatchErrors(errorObjects);
      }

      const { statusCode, response } = MessageController.formatResponse(results, requestId);

      logger.info(
        `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, "/send-to-phone", requestId);
    }
  }

  /**
   * Send to groups only - consolidated validation
   */
  public static async sendToGroup(req: Request, res: Response): Promise<void> {
    // Unified client validation
    const clientValidation = MessageController.validateClientAndReturn(res);
    if (!clientValidation) return;
    
    const { client, requestId } = clientValidation;

    const validation = RequestValidationService.validateMessageRequest(req, res, true);
    if (!validation.isValid) return;

    const recipientValidation = RequestValidationService.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const { message } = validation.body!;
    const file = validation.file;
    
    // Use RecipientProcessorService instead of extractRecipients  
    const { groups } = await RecipientProcessorService.processRecipients(recipientValidation.body!);
    
    if (groups.length === 0) {
      res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: No valid group IDs found",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      logger.info(`📱 [BOT] Request ${requestId}: Sending to ${groups.length} group(s)`, '🏢');

      const results = await sendToGroups(client, groups, message!, file);

      if (results.errors.length > 0) {
        const errorObjects = results.errors.map(err => ({
          error: new Error(err.error),
          context: "/send-to-group", 
          recipient: err.recipient
        }));
        
        await messageErrorHandler.handleBatchErrors(errorObjects);
      }

      const { statusCode, response } = MessageController.formatResponse(results, requestId);

      logger.info(
        `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, "/send-to-group", requestId);
    }
  }

  /**
   * Unified message handler - handles text, media, mixed recipients automatically
   * This is the main endpoint that processes everything based on payload content
   */
  public static async sendBroadcast(req: Request, res: Response): Promise<void> {
    // Unified client validation
    const clientValidation = MessageController.validateClientAndReturn(res);
    if (!clientValidation) return;
    
    const { client, requestId } = clientValidation;

    const validation = RequestValidationService.validateMessageRequest(req, res, true);
    if (!validation.isValid) return;

    const recipientValidation = RequestValidationService.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const { message, caption } = validation.body!;
    const file = validation.file;
    
    // Use RecipientProcessorService for unified processing
    const { groups, phoneNumbers } = await RecipientProcessorService.processRecipients(recipientValidation.body!);
    const recipients = [...phoneNumbers, ...groups];

    try {
      let messageType: DetectedMediaType = "text";
      let textContent = message;
      let results;

      // Detect if this is a media message or text message
      if (file) {
        messageType = detectMediaType(file);
        
        // Validate media support
        const supportValidation = validateMediaTypeSupport(messageType, file.mimetype);
        if (!supportValidation.isSupported) {
          res.status(400).json({
            success: false,
            error: `MEDIA_NOT_SUPPORTED: ${supportValidation.reason}`,
            requestId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validate file size
        const sizeLimit = getFileSizeLimit(messageType);
        if (file.size > sizeLimit) {
          res.status(400).json({
            success: false,
            error: `FILE_TOO_LARGE: File size ${file.size} bytes exceeds limit of ${sizeLimit} bytes for ${messageType}`,
            requestId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Determine text content based on media type
        const textField = getTextFieldForMediaType(messageType);
        textContent = textField === "caption" ? caption : message;

        logger.info(
          `� [BOT] Request ${requestId}: Sending ${messageType.toUpperCase()} to ${recipients.length} recipient(s)`
        );

        // Send media based on detected type
        switch (messageType) {
          case "image":
            results = await sendImageMessage(client, recipients, file, textContent || "");
            break;
          case "document":
            results = await sendDocumentMessage(client, recipients, file, textContent || "");
            break;
          case "audio":
            results = await sendAudioMessage(client, recipients, file, textContent || "");
            break;
          case "video":
            results = await sendVideoMessage(client, recipients, file, textContent || "");
            break;
          default:
            throw new Error(`Unsupported media type: ${messageType}`);
        }
      } else {
        // Text-only message
        if (!message) {
          res.status(400).json({
            success: false,
            error: "VALIDATION_ERROR: message is required when no file is provided",
            requestId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(
          `📡 [BOT] Request ${requestId}: Sending TEXT to ${recipients.length} recipient(s)`
        );

        // Use unified message handler from MessageHandlerController
        results = await sendMessageWithErrorHandling(
          client,
          recipients,
          "TEXT",
          { text: message }
        );
      }

      // Handle errors
      if (results.errors.length > 0) {
        const errorObjects = results.errors.map(err => ({
          error: new Error(err.error),
          context: "/send-message",
          recipient: err.recipient
        }));
        
        await messageErrorHandler.handleBatchErrors(errorObjects);
      }

      // Format response with media info if applicable
      const additionalData = file ? {
        mediaType: messageType,
        fileName: file.originalname,
        fileSize: file.size,
      } : undefined;

      const { statusCode, response } = MessageController.formatResponse(results, requestId, additionalData);

      logger.info(
        `Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors, type: ${messageType.toUpperCase()}`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, "/send-message", requestId);
    }
  }

  /**
   * Send media messages (images, documents, audio, video)
   */
  public static async sendMedia(
    req: Request,
    res: Response,
    mediaType: "image" | "document" | "audio" | "video"
  ): Promise<void> {
    // Unified client validation
    const clientValidation = MessageController.validateClientAndReturn(res);
    if (!clientValidation) return;
    
    const { client, requestId } = clientValidation;

    const fileValidation = RequestValidationService.validateFileUpload(
      req,
      res,
      mediaType,
      ["image/*", "application/*", "audio/*", "video/*"]
    );
    if (!fileValidation.isValid) return;

    const recipientValidation = RequestValidationService.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const file = fileValidation.file!;
    
    // Use RecipientProcessorService for unified processing
    const { phoneNumbers, groups } = await RecipientProcessorService.processRecipients(recipientValidation.body!);
    const recipients = [...phoneNumbers, ...groups];

    try {
      logger.info(`📎 [BOT] Request ${requestId}: Sending ${mediaType} to ${recipients.length} recipient(s)`);

      let results;
      switch (mediaType) {
        case "image":
          results = await sendImageMessage(client, recipients, file);
          break;
        case "document":
          results = await sendDocumentMessage(client, recipients, file);
          break;
        case "audio":
          results = await sendAudioMessage(client, recipients, file);
          break;
        case "video":
          results = await sendVideoMessage(client, recipients, file);
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      if (results.errors.length > 0) {
        const errorObjects = results.errors.map(err => ({
          error: new Error(err.error),
          context: `/send-${mediaType}`,
          recipient: err.recipient
        }));
        
        await messageErrorHandler.handleBatchErrors(errorObjects);
      }

      const { statusCode, response } = MessageController.formatResponse(results, requestId, {
        mediaType,
        fileName: file.originalname,
        fileSize: file.size,
      });

      logger.info(
        `Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, `/send-${mediaType}`, requestId);
    }
  }
}

// Export both named and default exports for compatibility
export default MessageController;
