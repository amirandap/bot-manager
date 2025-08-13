
import { botLogger } from "../utils";
import { MessageErrorHandlerService } from "../services";
import { validateErrorSeverity, isPostSendErrorType } from "../utils/errorHandlerUtils";
import { sendTextMessage } from "../utils/textMessaging";
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "whatsapp-web.js";
import {
  sendImageMessage,
  sendDocumentMessage,
  sendAudioMessage,
  sendVideoMessage,
} from "../services/MediaMessagingService";
import { DEFAULT_FALLBACK_PHONE_NUMBER } from "../config/EnvironmentManager";
import { MediaResult, MessageHandlerResult, MessageType } from "../types/types";
/**
 * Message Handler Controller
 * Unified message handler that integrates error handling and fallback mechanisms
 * This controller replaces legacy helpers and provides centralized message handling
 */
export class MessageHandlerController {
  
  /**
   * Main unified message handler
   */
  public static async sendMessageWithErrorHandling(
    client: Client | null,
    recipients: string[],
    messageType: MessageType,
    content: {
      text?: string;
      file?: Express.Multer.File;
      imageUrl?: string; // New: Support for image URLs
      caption?: string;
      message?: string;
      filename?: string; // New: Support for custom filenames
    }
  ): Promise<MessageHandlerResult> {
    const result: MessageHandlerResult = {
      success: false,
      messagesSent: [],
      errors: [],
      fallbackSent: false,
    };

    if (!client) {
      const error = {
        recipient: "ALL",
        error: "WhatsApp client not initialized",
        errorType: "CLIENT_NOT_INITIALIZED",
        timestamp: new Date().toISOString(),
      };

      result.errors.push(error);
      return result;
    }

    let mediaResult: MediaResult;

    try {
      // Send messages based on type
      switch (messageType) {
        case "TEXT": {
          if (!content.text) {
            throw new Error("Text content is required for TEXT messages");
          }
          mediaResult = await sendTextMessage(client, recipients, content.text);
          break;
        }

        case "IMAGE": {
          // Support both file uploads and URLs
          if (!content.file && !content.imageUrl) {
            throw new Error("File or imageUrl is required for IMAGE messages");
          }
          const imageSource = content.file || content.imageUrl!;
          mediaResult = await sendImageMessage(
            client,
            recipients,
            imageSource,
            content.caption,
            content.filename
          );
          break;
        }

        case "DOCUMENT": {
          if (!content.file) {
            throw new Error("File is required for DOCUMENT messages");
          }
          mediaResult = await sendDocumentMessage(
            client,
            recipients,
            content.file,
            content.message
          );
          break;
        }

        case "AUDIO": {
          if (!content.file) {
            throw new Error("File is required for AUDIO messages");
          }
          mediaResult = await sendAudioMessage(
            client,
            recipients,
            content.file,
            content.message
          );
          break;
        }

        case "VIDEO": {
          if (!content.file) {
            throw new Error("File is required for VIDEO messages");
          }
          mediaResult = await sendVideoMessage(
            client,
            recipients,
            content.file,
            content.caption
          );
          break;
        }

        default:
          throw new Error(`Unsupported message type: ${messageType}`);
      }

      // Process results
      result.messagesSent = mediaResult.messagesSent;
      result.errors = mediaResult.errors;
      result.success = result.messagesSent.length > 0;

      // Handle errors with centralized error handler
      if (result.errors.length > 0) {
        try {
          await MessageErrorHandler.sendErrorReport(
            client,
            { messageType, recipients, content },
            result.errors,
            `message-handler-${messageType.toLowerCase()}`
          );
          result.fallbackSent = true;
        } catch (errorHandlerError: any) {
          botLogger.error(
            `Error handler failed: ${errorHandlerError}`
          );
        }
      }
    } catch (criticalError: any) {
      botLogger.error(
        `Critical error in message handling: ${criticalError}`
      );

      // Validate if it's a WhatsApp-specific error
      const errorValidation = validateWhatsAppError(criticalError);

      const criticalErrorObj = {
        recipient: "ALL",
        error: criticalError.message || "Critical error in message handling",
        errorType: errorValidation.isPostSendError
          ? "POST_SEND_CRITICAL_ERROR"
          : "SYSTEM_CRITICAL_ERROR",
        timestamp: new Date().toISOString(),
      };

      result.errors.push(criticalErrorObj);

      // Try to send critical error to fallback
      try {
        const fallbackMessage =
          "🚨 CRITICAL BOT ERROR 🚨\n\n" +
          `Message Type: ${messageType}\n` +
          `Recipients: ${recipients.join(", ")}\n` +
          `Error: ${criticalError.message}\n` +
          `Time: ${new Date().toISOString()}\n\n` +
          `Error Type: ${errorValidation.errorType}\n` +
          `Description: ${errorValidation.description}\n` +
          `Is Post-Send Error: ${errorValidation.isPostSendError ? "Yes" : "No"}`;

        await sendErrorMessage(client, fallbackMessage);
        result.fallbackSent = true;
        botLogger.success("Critical error sent to fallback");
      } catch (fallbackError: any) {
        botLogger.error(
          `Failed to send critical error to fallback: ${fallbackError}`
        );
      }
    }

    return result;
  }

  /**
   * Simplified text message sender with error handling
   * Wrapper for common text message use cases
   */
  public static async sendTextWithErrorHandling(
    client: Client | null,
    recipients: string[],
    message: string
  ): Promise<MessageHandlerResult> {
    return this.sendMessageWithErrorHandling(client, recipients, "TEXT", {
      text: message,
    });
  }

  /**
   * Send image from URL with error handling
   * Wrapper for URL-based image sending (replaces legacy sendImageAndMessage)
   */
  public static async sendImageFromUrl(
    client: Client | null,
    recipients: string[],
    imageUrl: string,
    caption?: string,
    filename?: string
  ): Promise<MessageHandlerResult> {
    return this.sendMessageWithErrorHandling(client, recipients, "IMAGE", {
      imageUrl,
      caption,
      filename,
    });
  }

  /**
   * Send notification about bot status changes
   * Uses fallback number for system notifications
   */
  public static async sendSystemNotification(
    client: Client | null,
    message: string,
    isError: boolean = false
  ): Promise<void> {
    if (!client) {
      botLogger.error("Client not initialized");
      return;
    }

    const fallbackNumber = DEFAULT_FALLBACK_PHONE_NUMBER;
    const prefix = isError ? "🚨 BOT ERROR 🚨" : "ℹ️ BOT NOTIFICATION";
    const fullMessage = `${prefix}\n\n${message}\n\nTime: ${new Date().toISOString()}`;

    try {
      await sendErrorMessage(client, fullMessage, fallbackNumber);
      botLogger.success(
        `${
          isError ? "Error" : "Info"
        } notification sent to fallback`
      );
    } catch (error: any) {
      botLogger.error(
        `Failed to send notification: ${error}`
      );
    }
  }

  /**
   * Batch send messages with improved error handling and progress tracking
   * Useful for bulk operations where you want detailed feedback
   */
  public static async sendMessagesBatch(
    client: Client | null,
    batches: Array<{
      recipients: string[];
      messageType: MessageType;
      content: {
        text?: string;
        file?: Express.Multer.File;
        caption?: string;
        message?: string;
      };
    }>
  ): Promise<{
    overallSuccess: boolean;
    batchResults: MessageHandlerResult[];
    summary: {
      totalBatches: number;
      successfulBatches: number;
      totalMessagesSent: number;
      totalErrors: number;
    };
  }> {
    const batchResults: MessageHandlerResult[] = [];
    let totalMessagesSent = 0;
    let totalErrors = 0;
    let successfulBatches = 0;

    botLogger.info(
      `Starting batch send of ${batches.length} batches`
    );

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      botLogger.info(
        `Processing batch ${i + 1}/${batches.length}`
      );

      try {
        const result = await this.sendMessageWithErrorHandling(
          client,
          batch.recipients,
          batch.messageType,
          batch.content
        );

        batchResults.push(result);
        totalMessagesSent += result.messagesSent.length;
        totalErrors += result.errors.length;

        if (result.success) {
          successfulBatches++;
        }

        // Small delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (batchError: any) {
        botLogger.error(`❌ [BATCH_HANDLER] Error in batch ${i + 1}:`);

        const errorResult: MessageHandlerResult = {
          success: false,
          messagesSent: [],
          errors: [
            {
              recipient: "BATCH",
              error: batchError.message || "Batch processing error",
              errorType: "BATCH_ERROR",
              timestamp: new Date().toISOString(),
            },
          ],
        };

        batchResults.push(errorResult);
        totalErrors++;
      }
    }

    const overallSuccess = successfulBatches > 0 && totalErrors === 0;

    botLogger.info(
      `Batch complete: ${successfulBatches}/${batches.length} successful, ${totalMessagesSent} messages sent, ${totalErrors} errors`
    );

    return {
      overallSuccess,
      batchResults,
      summary: {
        totalBatches: batches.length,
        successfulBatches,
        totalMessagesSent,
        totalErrors,
      },
    };
  }

  /**
   * Send messages to groups with unified error handling
   * Consolidated from groupMessageHandler.ts
   */
  public static async sendToGroups(
    client: Client | null,
    groups: string[],
    message: string,
    file?: Express.Multer.File
  ): Promise<{
    messagesSent: string[];
    errors: Array<{
      recipient: string;
      error: string;
      errorType: string;
      timestamp: string;
    }>;
  }> {
    const messagesSent: string[] = [];
    const errors: Array<{
      recipient: string;
      error: string;
      errorType: string;
      timestamp: string;
    }> = [];

    if (!client) {
      errors.push({
        recipient: "ALL",
        error: "WhatsApp client not initialized",
        errorType: "CLIENT_NOT_INITIALIZED",
        timestamp: new Date().toISOString(),
      });
      return { messagesSent, errors };
    }

    for (const groupId of groups) {
      try {
        botLogger.info(`🏢 [BOT] Sending to group: ${groupId}`, '🏢');
        botLogger.info(`🔍 [BOT] Message content: "${message}"`, '💬');
        botLogger.environmentInfo(`📁 [BOT] Has file attachment: ${!!file}`);

        let sendResult;
        if (file) {
          botLogger.info(
            `Sending file to group: ${file.originalname} (${file.mimetype})`
          );
          sendResult = await client.sendMessage(
            groupId,
            { data: file.buffer.toString("base64"), mimetype: file.mimetype },
            { caption: message }
          );
        } else {
          botLogger.info("Sending text message to group");
          sendResult = await client.sendMessage(groupId, message);
        }

        botLogger.info(`Send result: ${JSON.stringify(sendResult)}`);
        messagesSent.push(groupId);
        botLogger.info(`✅ [BOT] Group message sent successfully to: ${groupId}`, '✅');
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        const errorStack =
          error instanceof Error ? error.stack : "No stack trace";

        // Use standardized error validation to determine if fallback should be sent
        const sendFallback = shouldSendFallback(error, "GROUP_MESSAGE", groupId);

        if (!sendFallback) {
          // Post-send error - message was likely delivered successfully
          messagesSent.push(groupId);
          botLogger.success(
            "Treating as successful send despite post-send error"
          );
        } else {
          // Critical error - actual delivery failure
          botLogger.error(
            `Critical error sending message to group ${groupId}:`
          );
          botLogger.error(`   Error Type: ${typeof error}`);
          botLogger.error(`   Error Message: ${reason}`);
          botLogger.error(`   Error Stack: ${errorStack}`);
          botLogger.error(`   Full Error Object: ${JSON.stringify(error)}`);

          errors.push({
            recipient: groupId,
            error: reason,
            errorType: "GROUP_SEND_ERROR",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return { messagesSent, errors };
  }

  /**
   * Send messages to phone numbers with unified error handling
   * Consolidated from phoneMessageHandler.ts
   */
  public static async sendToPhones(
    client: Client | null,
    phoneNumbers: string[],
    message: string,
    file?: Express.Multer.File
  ): Promise<{
    messagesSent: string[];
    errors: Array<{
      recipient: string;
      error: string;
      errorType: string;
      timestamp: string;
    }>;
  }> {
    const messagesSent: string[] = [];
    const errors: Array<{
      recipient: string;
      error: string;
      errorType: string;
      timestamp: string;
    }> = [];

    if (!client) {
      errors.push({
        recipient: "ALL",
        error: "WhatsApp client not initialized",
        errorType: "CLIENT_NOT_INITIALIZED",
        timestamp: new Date().toISOString(),
      });
      return { messagesSent, errors };
    }

    for (const number of phoneNumbers) {
      try {
        if (file) {
          // Use document message sender
          const result = await sendDocumentMessage(
            client,
            [number],
            file,
            message
          );

          if (result.messagesSent.length > 0) {
            messagesSent.push(...result.messagesSent);
          }

          if (result.errors.length > 0) {
            // Convert MediaResult errors to ErrorObject format
            const convertedErrors = result.errors.map((err) => ({
              recipient: err.recipient,
              error: err.error,
              errorType: err.errorType,
              timestamp: err.timestamp,
            }));
            errors.push(...convertedErrors);
          }
        } else {
          // Use text message sender
          const result = await sendTextMessage(client, [number], message);

          if (result.messagesSent.length > 0) {
            messagesSent.push(...result.messagesSent);
          }

          if (result.errors.length > 0) {
            // Convert MediaResult errors to ErrorObject format
            const convertedErrors = result.errors.map((err) => ({
              recipient: err.recipient,
              error: err.error,
              errorType: err.errorType,
              timestamp: err.timestamp,
            }));
            errors.push(...convertedErrors);
          }
        }
      } catch (error: unknown) {
        // Critical errors that couldn't be handled by the new message functions
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        const errorDetails = {
          recipient: number,
          error: errorMessage,
          errorType: "CRITICAL_ERROR",
          timestamp: new Date().toISOString(),
        };

        errors.push(errorDetails);
      }
    }

    return { messagesSent, errors };
  }
}

// Export static methods for backwards compatibility
export const sendMessageWithErrorHandling = MessageHandlerController.sendMessageWithErrorHandling;
export const sendTextWithErrorHandling = MessageHandlerController.sendTextWithErrorHandling;
export const sendImageFromUrl = MessageHandlerController.sendImageFromUrl;
export const sendSystemNotification = MessageHandlerController.sendSystemNotification;
export const sendMessagesBatch = MessageHandlerController.sendMessagesBatch;
export const sendToGroups = MessageHandlerController.sendToGroups;
export const sendToPhones = MessageHandlerController.sendToPhones;
