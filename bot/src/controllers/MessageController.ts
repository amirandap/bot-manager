import { botLogger } from '../utils/loggerWrapper';

/**
 * Centralized Message Controller
 * Handles all message sending operations with unified validation, error handling, and response formatting
 */

import { Request, Response } from "express";
import { getClient } from "../config/clientExporter";
import { MessageErrorHandler } from "../utils/errorHandler";
import {
  sendToPhones,
  sendToGroups,
  sendMessageWithErrorHandling,
} from "../utils/messageHandler";
import {
  sendImageMessage,
  sendDocumentMessage,
  sendAudioMessage,
  sendVideoMessage,
} from "../utils/mediaMessaging";
import { separateRecipients } from "../utils/recipientFormatting";
import {
  MessageType,
  SendResponse,
  MediaSendResponse,
  BaseMessageRequestBody,
} from "../types/types";

export class MessageController {
  /**
   * Unified client validation middleware
   */
  private static validateClient(req: Request, res: Response): boolean {
    const client = getClient();
    if (!client) {
      const requestId = Date.now().toString(36);
      res.status(503).json({
        success: false,
        error: "WhatsApp client not ready",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
    return true;
  }

  /**
   * Unified request validation
   */
  private static validateMessageRequest(
    req: Request,
    res: Response,
    options: {
      requiresRecipients?: boolean;
      requiresMessage?: boolean;
      requiresFile?: boolean;
      allowedRecipientTypes?: ("phone" | "group")[];
    } = {}
  ): {
    isValid: boolean;
    requestId?: string;
    recipients?: string[];
    message?: string;
    file?: Express.Multer.File;
  } {
    const requestId = Date.now().toString(36);
    const {
      requiresRecipients = true,
      requiresMessage = true,
      requiresFile = false,
      allowedRecipientTypes = ["phone", "group"],
    } = options;

    // Extract recipients from various possible fields
    const { phoneNumber, to, groupId, group_id } = req.body;
    let recipients: string[] = [];

    if (phoneNumber) {
      recipients = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber];
    } else if (to) {
      recipients = Array.isArray(to) ? to : [to];
    } else if (groupId) {
      recipients = Array.isArray(groupId) ? groupId : [groupId];
    } else if (group_id) {
      recipients = Array.isArray(group_id) ? group_id : [group_id];
    }

    // Validate recipients
    if (requiresRecipients && recipients.length === 0) {
      res.status(400).json({
        success: false,
        error:
          "VALIDATION_ERROR: Recipients required (phoneNumber, to, groupId, or group_id)",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return { isValid: false };
    }

    // Validate recipient types
    if (recipients.length > 0) {
      const { groups, phoneNumbers } = separateRecipients(recipients);

      if (!allowedRecipientTypes.includes("phone") && phoneNumbers.length > 0) {
        res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR: Phone numbers not allowed in this endpoint",
          invalidRecipients: phoneNumbers,
          requestId,
          timestamp: new Date().toISOString(),
        });
        return { isValid: false };
      }

      if (!allowedRecipientTypes.includes("group") && groups.length > 0) {
        res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR: Group IDs not allowed in this endpoint",
          invalidRecipients: groups,
          requestId,
          timestamp: new Date().toISOString(),
        });
        return { isValid: false };
      }
    }

    // Validate message
    const { message } = req.body;
    if (requiresMessage && (!message || typeof message !== "string")) {
      res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: message is required (string)",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return { isValid: false };
    }

    // Validate file
    const file = req.file;
    if (requiresFile && !file) {
      res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR: file is required",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return { isValid: false };
    }

    return {
      isValid: true,
      requestId,
      recipients,
      message,
      file,
    };
  }

  /**
   * Unified response formatting
   */
  private static formatResponse(
    results: { messagesSent: string[]; errors: any[] },
    requestId: string,
    additionalData?: Record<string, any>
  ): { statusCode: number; response: SendResponse | MediaSendResponse } {
    const statusCode =
      results.errors.length === 0
        ? 200
        : results.messagesSent.length === 0
        ? 500
        : 207; // Multi-Status

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
   * Unified error handling
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
      error: `${endpoint
        .toUpperCase()
        .replace(/[^A-Z]/g, "_")}_ERROR: Internal server error`,
      errorType,
      details: errorDetails.troubleshooting,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send to phone numbers only
   */
  public static async sendToPhone(req: Request, res: Response): Promise<void> {
    if (!MessageController.validateClient(req, res)) return;

    const validation = MessageController.validateMessageRequest(req, res, {
      allowedRecipientTypes: ["phone"],
    });

    if (!validation.isValid) return;

    const { requestId, recipients, message, file } = validation;
    const client = getClient()!;

    try {
      console.log(
        `📱 [BOT] Request ${requestId}: Sending to ${
          recipients!.length
        } phone(s)`
      );

      const results = await sendToPhones(client, recipients!, message!, file);

      // Send error report if needed
      if (results.errors.length > 0) {
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          results.errors,
          "/send-to-phone"
        );
      }

      const { statusCode, response } = MessageController.formatResponse(
        results,
        requestId!
      );

      console.log(
        `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(
        error,
        req,
        res,
        "/send-to-phone",
        requestId!
      );
    }
  }

  /**
   * Send to groups only
   */
  public static async sendToGroup(req: Request, res: Response): Promise<void> {
    if (!MessageController.validateClient(req, res)) return;

    const validation = MessageController.validateMessageRequest(req, res, {
      allowedRecipientTypes: ["group"],
    });

    if (!validation.isValid) return;

    const { requestId, recipients, message, file } = validation;
    const client = getClient()!;

    try {
      console.log(
        `🏢 [BOT] Request ${requestId}: Sending to ${
          recipients!.length
        } group(s)`
      );

      const results = await sendToGroups(client, recipients!, message!, file);

      // Send error report if needed
      if (results.errors.length > 0) {
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          results.errors,
          "/send-to-group"
        );
      }

      const { statusCode, response } = MessageController.formatResponse(
        results,
        requestId!
      );

      console.log(
        `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(
        error,
        req,
        res,
        "/send-to-group",
        requestId!
      );
    }
  }

  /**
   * Send broadcast (to both phones and groups)
   */
  public static async sendBroadcast(
    req: Request,
    res: Response
  ): Promise<void> {
    if (!MessageController.validateClient(req, res)) return;

    const validation = MessageController.validateMessageRequest(req, res, {
      allowedRecipientTypes: ["phone", "group"],
    });

    if (!validation.isValid) return;

    const { requestId, recipients, message, file } = validation;
    const client = getClient()!;

    try {
      const { groups, phoneNumbers } = separateRecipients(recipients!);

      console.log(
        `📢 [BOT] Request ${requestId}: Broadcasting to ${phoneNumbers.length} phone(s) + ${groups.length} group(s)`
      );

      // Send to both types
      const [groupResults, phoneResults] = await Promise.all([
        sendToGroups(client, groups, message!, file),
        sendToPhones(client, phoneNumbers, message!, file),
      ]);

      // Combine results
      const allMessagesSent = [
        ...groupResults.messagesSent,
        ...phoneResults.messagesSent,
      ];
      const allErrors = [...groupResults.errors, ...phoneResults.errors];

      // Send error report if needed
      if (allErrors.length > 0) {
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          allErrors,
          "/send-broadcast"
        );
      }

      const { statusCode, response } = MessageController.formatResponse(
        { messagesSent: allMessagesSent, errors: allErrors },
        requestId!,
        {
          breakdown: {
            phonesSent: phoneResults.messagesSent.length,
            groupsSent: groupResults.messagesSent.length,
            phoneErrors: phoneResults.errors.length,
            groupErrors: groupResults.errors.length,
          },
        }
      );

      console.log(
        `✅ [BOT] Request ${requestId} completed: ${allMessagesSent.length} sent, ${allErrors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(
        error,
        req,
        res,
        "/send-broadcast",
        requestId!
      );
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
    if (!MessageController.validateClient(req, res)) return;

    const validation = MessageController.validateMessageRequest(req, res, {
      requiresMessage: false, // Media can have optional captions
      requiresFile: true,
    });

    if (!validation.isValid) return;

    const { requestId, recipients, message, file } = validation;
    const client = getClient()!;

    try {
      console.log(
        `📁 [BOT] Request ${requestId}: Sending ${mediaType} to ${
          recipients!.length
        } recipient(s)`
      );

      let results;
      switch (mediaType) {
        case "image":
          results = await sendImageMessage(client, recipients!, file!, message);
          break;
        case "document":
          results = await sendDocumentMessage(
            client,
            recipients!,
            file!,
            message
          );
          break;
        case "audio":
          results = await sendAudioMessage(client, recipients!, file!, message);
          break;
        case "video":
          results = await sendVideoMessage(client, recipients!, file!, message);
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      // Send error report if needed
      if (results.errors.length > 0) {
        await MessageErrorHandler.sendErrorReport(
          client,
          req.body,
          results.errors,
          `/send-${mediaType}`
        );
      }

      const { statusCode, response } = MessageController.formatResponse(
        results,
        requestId!,
        {
          fileInfo: {
            name: file!.originalname,
            size: file!.size,
            type: file!.mimetype,
          },
        }
      );

      console.log(
        `✅ [BOT] Request ${requestId} completed: ${results.messagesSent.length} sent, ${results.errors.length} errors`
      );

      res.status(statusCode).json(response);
    } catch (error) {
      await MessageController.handleError(
        error,
        req,
        res,
        `/send-${mediaType}`,
        requestId!
      );
    }
  }

  /**
   * Simple message sending (legacy compatibility)
   */
  public static async sendSimpleMessage(
    req: Request,
    res: Response
  ): Promise<void> {
    if (!MessageController.validateClient(req, res)) return;

    const requestId = Date.now().toString(36);
    const { phone, message } = req.body;

    if (!phone || !message) {
      res.status(400).json({
        success: false,
        error: "Phone and message are required",
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const client = getClient()!;

    try {
      botLogger.info(`💬 [BOT] Simple message request ${requestId}: ${phone}`, '💬');

      // Use the unified message handler
      const results = await sendMessageWithErrorHandling(
        client,
        [phone],
        "TEXT",
        {
          text: message,
        }
      );

      if (results.success) {
        res.json({
          success: true,
          message: "Message sent successfully",
          to: phone,
          requestId,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to send message",
          errors: results.errors,
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      await MessageController.handleError(
        error,
        req,
        res,
        "/send-message",
        requestId
      );
    }
  }
}
