import { botLogger } from '../utils/loggerWrapper';

/**
 * Centralized Message Controller - CONSOLIDATED VERSION
 * 
 * ELIMINATES DUPLICATIONS BY USING:
 * - MessageHandlerController for message handling (NOT old messageHandler.ts)
 * - RequestValidator for validation (NOT internal duplicate methods)
 * - MessageErrorHandler for error handling
 * - Unified client checking (NO duplicate validateClient methods)
 */

import { Request, Response } from "express";
import { getClient } from "../config/clientExporter";
import { MessageErrorHandler } from "../utils/errorHandler";
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
import { separateRecipients } from "../utils/recipientFormatting";
import RequestValidator from "../utils/requestValidator";
import {
  MessageType,
  SendResponse,
  MediaSendResponse,
  BaseMessageRequestBody,
} from "../types/types";

export class MessageController {
  /**
   * Extract recipients from request body - consolidated logic
   */
  private static extractRecipients(body: BaseMessageRequestBody): string[] {
    const { phoneNumber, to, group_id } = body;
    
    if (phoneNumber) {
      return Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber];
    } else if (to) {
      return Array.isArray(to) ? to : [to];
    } else if (group_id) {
      return Array.isArray(group_id) ? group_id : [group_id];
    }
    
    return [];
  }

  /**
   * Unified response formatting - uses RequestValidator methods
   */
  private static formatResponse(
    results: { messagesSent: string[]; errors: any[] },
    requestId: string,
    additionalData?: Record<string, any>
  ): { statusCode: number; response: SendResponse | MediaSendResponse } {
    const statusCode = RequestValidator.getResponseStatus(results.errors, results.messagesSent);

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
   * Unified error handling - uses MessageErrorHandler
   */
  private static async handleError(
    error: unknown,
    req: Request,
    res: Response,
    endpoint: string,
    requestId: string
  ): Promise<void> {
    botLogger.error(`❌ [BOT] Request ${requestId} failed:`);

    const client = getClient();
    const { errorType, errorDetails } =
      await MessageErrorHandler.handleCriticalError(
        client,
        error,
        req.body,
        endpoint
      );

    res.status(500).json({
      success: false,
      error: `${endpoint.toUpperCase().replace(/[^A-Z]/g, "_")}_ERROR: Internal server error`,
      errorType,
      details: errorDetails.troubleshooting,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send to phone numbers only - consolidated validation
   */
  public static async sendToPhone(req: Request, res: Response): Promise<void> {
    // Single client check - no duplicate methods
    const client = getClient();
    if (!client) {
      const requestId = Date.now().toString(36);
      res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Use RequestValidator - no duplicate validation
    const validation = RequestValidator.validateMessageRequest(req, res, true);
    if (!validation.isValid) return;

    const recipientValidation = RequestValidator.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const requestId = Date.now().toString(36);
    const { message } = validation.body!;
    const file = validation.file;
    const recipients = MessageController.extractRecipients(recipientValidation.body!);
    
    // Filter only phone numbers
    const { phoneNumbers } = separateRecipients(recipients);
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
      botLogger.info(`📱 [BOT] Request ${requestId}: Sending to ${phoneNumbers.length} phone(s)`);

      // Use MessageHandlerController - no old messageHandler.ts
      const results = await sendToPhones(client, phoneNumbers, message!, file);

      if (results.errors.length > 0) {
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          results.errors,
          "/send-to-phone"
        );
      }

      const { statusCode, response } = MessageController.formatResponse(results, requestId);

      botLogger.success(
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
    const client = getClient();
    if (!client) {
      const requestId = Date.now().toString(36);
      res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const validation = RequestValidator.validateMessageRequest(req, res, true);
    if (!validation.isValid) return;

    const recipientValidation = RequestValidator.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const requestId = Date.now().toString(36);
    const { message } = validation.body!;
    const file = validation.file;
    const recipients = MessageController.extractRecipients(recipientValidation.body!);
    
    // Filter only group IDs
    const { groups } = separateRecipients(recipients);
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
      botLogger.info(`📱 [BOT] Request ${requestId}: Sending to ${groups.length} group(s)`, '🏢');

      const results = await sendToGroups(client, groups, message!, file);

      if (results.errors.length > 0) {
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          results.errors,
          "/send-to-group"
        );
      }

      const { statusCode, response } = MessageController.formatResponse(results, requestId);

      botLogger.success(
        `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, "/send-to-group", requestId);
    }
  }

  /**
   * Send broadcast to both phones and groups - consolidated logic
   */
  public static async sendBroadcast(req: Request, res: Response): Promise<void> {
    const client = getClient();
    if (!client) {
      const requestId = Date.now().toString(36);
      res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const validation = RequestValidator.validateMessageRequest(req, res, true);
    if (!validation.isValid) return;

    const recipientValidation = RequestValidator.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const requestId = Date.now().toString(36);
    const { message } = validation.body!;
    const file = validation.file;
    const recipients = MessageController.extractRecipients(recipientValidation.body!);
    
    const { groups, phoneNumbers } = separateRecipients(recipients);

    try {
      botLogger.info(
        `📡 [BOT] Request ${requestId}: Broadcasting to ${phoneNumbers.length} phone(s) and ${groups.length} group(s)`
      );

      // Use unified message handler from MessageHandlerController
      const results = await sendMessageWithErrorHandling(
        client,
        [...phoneNumbers, ...groups],
        "TEXT",
        { text: message!, file }
      );

      if (results.errors.length > 0) {
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          results.errors,
          "/send-broadcast"
        );
      }

      const { statusCode, response } = MessageController.formatResponse(results, requestId);

      botLogger.success(
        `Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, "/send-broadcast", requestId);
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
    const client = getClient();
    if (!client) {
      const requestId = Date.now().toString(36);
      res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const fileValidation = RequestValidator.validateFileUpload(
      req,
      res,
      mediaType,
      ["image/*", "application/*", "audio/*", "video/*"]
    );
    if (!fileValidation.isValid) return;

    const recipientValidation = RequestValidator.validateRecipients(req, res);
    if (!recipientValidation.isValid) return;

    const requestId = Date.now().toString(36);
    const file = fileValidation.file!;
    const recipients = MessageController.extractRecipients(recipientValidation.body!);

    try {
      botLogger.info(`📎 [BOT] Request ${requestId}: Sending ${mediaType} to ${recipients.length} recipient(s)`);

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
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          results.errors,
          `/send-${mediaType}`
        );
      }

      const { statusCode, response } = MessageController.formatResponse(results, requestId, {
        mediaType,
        fileName: file.originalname,
        fileSize: file.size,
      });

      botLogger.success(
        `Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, `/send-${mediaType}`, requestId);
    }
  }

  /**
   * Simple message endpoint for testing
   */
  public static async sendSimpleMessage(req: Request, res: Response): Promise<void> {
    const client = getClient();
    if (!client) {
      const requestId = Date.now().toString(36);
      res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const validation = RequestValidator.validateMessageRequest(req, res, true);
    if (!validation.isValid) return;

    const requestId = Date.now().toString(36);
    const { message, phoneNumber, to } = validation.body!;
    
    let recipients: string[] = [];
    if (phoneNumber) {
      recipients = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber];
    } else if (to) {
      recipients = Array.isArray(to) ? to : [to];
    } else {
      res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: phoneNumber or to is required",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      botLogger.info(`📱 [BOT] Request ${requestId}: Simple message to ${recipients.length} recipient(s)`, '💬');

      const results = await sendMessageWithErrorHandling(
        client,
        recipients,
        "TEXT",
        { text: message! }
      );

      const { statusCode, response } = MessageController.formatResponse(results, requestId);

      botLogger.success(
        `Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(error, req, res, "/send-simple-message", requestId);
    }
  }
}

// Export both named and default exports for compatibility
export default MessageController;
