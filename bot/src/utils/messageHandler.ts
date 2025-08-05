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
} from "./mediaMessaging";
import { sendTextMessage } from "./textMessaging";
import { sendErrorMessage } from "./errorHandler";
import { MediaResult } from "./messageTypes";
import { MessageErrorHandler } from "./errorHandler";
import { validateWhatsAppError, ErrorValidationResult } from "./errorHandler";
import { getFallbackNumber } from "./fallbackUtils";

export interface MessageHandlerResult {
  success: boolean;
  messagesSent: string[];
  errors: Array<{
    recipient: string;
    error: string;
    errorType: string;
    timestamp: string;
  }>;
  fallbackSent?: boolean;
  troubleshootingGuide?: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO';

/**
 * Unified message handler that integrates error handling and fallback mechanisms
 * This function replaces legacy helpers and provides centralized message handling
 */
export async function sendMessageWithErrorHandling(
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
  },
): Promise<MessageHandlerResult> {
  const result: MessageHandlerResult = {
    success: false,
    messagesSent: [],
    errors: [],
    fallbackSent: false
  };

  if (!client) {
    const error = {
      recipient: 'ALL',
      error: 'WhatsApp client not initialized',
      errorType: 'CLIENT_NOT_INITIALIZED',
      timestamp: new Date().toISOString()
    };
    
    result.errors.push(error);
    return result;
  }

  let mediaResult: MediaResult;

  try {
  // Send messages based on type
  switch (messageType) {
    case 'TEXT': {
      if (!content.text) {
        throw new Error('Text content is required for TEXT messages');
      }
      mediaResult = await sendTextMessage(client, recipients, content.text);
      break;
    }

    case 'IMAGE': {
      // Support both file uploads and URLs
      if (!content.file && !content.imageUrl) {
        throw new Error('File or imageUrl is required for IMAGE messages');
      }
      const imageSource = content.file || content.imageUrl!;
      mediaResult = await sendImageMessage(
        client,
        recipients,
        imageSource,
        content.caption,
        content.filename,
      );
      break;
    }

    case 'DOCUMENT': {
      if (!content.file) {
        throw new Error('File is required for DOCUMENT messages');
      }
      mediaResult = await sendDocumentMessage(
        client,
        recipients,
        content.file,
        content.message,
      );
      break;
    }

    case 'AUDIO': {
      if (!content.file) {
        throw new Error('File is required for AUDIO messages');
      }
      mediaResult = await sendAudioMessage(
        client,
        recipients,
        content.file,
        content.message,
      );
      break;
    }

    case 'VIDEO': {
      if (!content.file) {
        throw new Error('File is required for VIDEO messages');
      }
      mediaResult = await sendVideoMessage(
        client,
        recipients,
        content.file,
        content.caption,
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
        console.error(`❌ [MESSAGE_HANDLER] Error handler failed:`, errorHandlerError);
      }
    }

  } catch (criticalError: any) {
    console.error(`❌ [MESSAGE_HANDLER] Critical error in message handling:`, criticalError);
    
    // Validate if it's a WhatsApp-specific error
    const errorValidation = validateWhatsAppError(criticalError);
    
    const criticalErrorObj = {
      recipient: 'ALL',
      error: criticalError.message || 'Critical error in message handling',
      errorType: errorValidation.isPostSendError ? 'POST_SEND_CRITICAL_ERROR' : 'SYSTEM_CRITICAL_ERROR',
      timestamp: new Date().toISOString()
    };
    
    result.errors.push(criticalErrorObj);

    // Try to send critical error to fallback
    try {
      const fallbackMessage = `🚨 CRITICAL BOT ERROR 🚨\n\n` +
        `Message Type: ${messageType}\n` +
        `Recipients: ${recipients.join(', ')}\n` +
        `Error: ${criticalError.message}\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `Error Type: ${errorValidation.errorType}\n` +
        `Description: ${errorValidation.description}\n` +
        `Is Post-Send Error: ${errorValidation.isPostSendError ? 'Yes' : 'No'}`;

      await sendErrorMessage(client, fallbackMessage);
      result.fallbackSent = true;
      console.log(`✅ [MESSAGE_HANDLER] Critical error sent to fallback`);
    } catch (fallbackError: any) {
      console.error(`❌ [MESSAGE_HANDLER] Failed to send critical error to fallback:`, fallbackError);
    }
  }

  return result;
}

/**
 * Simplified text message sender with error handling
 * Wrapper for common text message use cases
 */
export async function sendTextWithErrorHandling(
  client: Client | null,
  recipients: string[],
  message: string,
): Promise<MessageHandlerResult> {
  return sendMessageWithErrorHandling(client, recipients, 'TEXT', { text: message });
}

/**
 * Send image from URL with error handling
 * Wrapper for URL-based image sending (replaces legacy sendImageAndMessage)
 */
export async function sendImageFromUrl(
  client: Client | null,
  recipients: string[],
  imageUrl: string,
  caption?: string,
  filename?: string,
): Promise<MessageHandlerResult> {
  return sendMessageWithErrorHandling(client, recipients, 'IMAGE', {
    imageUrl,
    caption,
    filename,
  });
}

/**
 * Send notification about bot status changes
 * Uses fallback number for system notifications
 */
export async function sendSystemNotification(
  client: Client | null,
  message: string,
  isError: boolean = false
): Promise<void> {
  if (!client) {
    console.error("❌ [SYSTEM_NOTIFICATION] Client not initialized");
    return;
  }

  const fallbackNumber = getFallbackNumber();
  const prefix = isError ? "🚨 BOT ERROR 🚨" : "ℹ️ BOT NOTIFICATION";
  const fullMessage = `${prefix}\n\n${message}\n\nTime: ${new Date().toISOString()}`;

  try {
    await sendErrorMessage(client, fullMessage, fallbackNumber);
    console.log(`✅ [SYSTEM_NOTIFICATION] ${isError ? 'Error' : 'Info'} notification sent to fallback`);
  } catch (error: any) {
    console.error(`❌ [SYSTEM_NOTIFICATION] Failed to send notification:`, error);
  }
}

/**
 * Batch send messages with improved error handling and progress tracking
 * Useful for bulk operations where you want detailed feedback
 */
export async function sendMessagesBatch(
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

  console.log(`📦 [BATCH_HANDLER] Starting batch send of ${batches.length} batches`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📤 [BATCH_HANDLER] Processing batch ${i + 1}/${batches.length}`);

    try {
      const result = await sendMessageWithErrorHandling(
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (batchError: any) {
      console.error(`❌ [BATCH_HANDLER] Error in batch ${i + 1}:`, batchError);
      
      const errorResult: MessageHandlerResult = {
        success: false,
        messagesSent: [],
        errors: [{
          recipient: 'BATCH',
          error: batchError.message || 'Batch processing error',
          errorType: 'BATCH_ERROR',
          timestamp: new Date().toISOString()
        }]
      };
      
      batchResults.push(errorResult);
      totalErrors++;
    }
  }

  const overallSuccess = successfulBatches > 0 && totalErrors === 0;

  console.log(`📊 [BATCH_HANDLER] Batch complete: ${successfulBatches}/${batches.length} successful, ${totalMessagesSent} messages sent, ${totalErrors} errors`);

  return {
    overallSuccess,
    batchResults,
    summary: {
      totalBatches: batches.length,
      successfulBatches,
      totalMessagesSent,
      totalErrors
    }
  };
}
