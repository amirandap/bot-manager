/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, MessageMedia } from "whatsapp-web.js";
import { 
  formatRecipient, 
  validateWhatsAppError, 
  createMessageMedia, 
  createMessageMediaFromUrl, 
  botLogger 
} from "../utils";
import { MediaResult } from "../types/types";
/**
 * Media messaging service
 * Updated to use the new centralized error handler
 */

// Get error handler instance
// No need for error handler instance anymore - use pure functions

/**
 * Send image message to multiple recipients
 * Supports both uploaded files and URLs
 */
export async function sendImageMessage(
  client: Client | null,
  recipients: string[],
  source: Express.Multer.File | string, // File object or URL string
  caption?: string,
  filename?: string
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error("WhatsApp client not initialized");
  }

  let media: MessageMedia;

  try {
    // Determine if source is a file or URL
    if (typeof source === "string") {
      // Source is a URL
      media = await createMessageMediaFromUrl(source, filename);
    } else {
      // Source is an uploaded file
      media = createMessageMedia(source, filename);
    }
  } catch (mediaError: any) {
    throw new Error(`Media creation failed: ${mediaError.message}`);
  }

  for (const recipient of recipients) {
    try {
      const formattedRecipient = formatRecipient(recipient);
      // eslint-disable-next-line no-console
      botLogger.info(`🖼️ [BOT] Sending image to: ${formattedRecipient}`);

      // For images, WhatsApp uses sendMessage with media and optional caption
      if (caption && caption.trim()) {
        await client.sendMessage(formattedRecipient, caption, { media });
      } else {
        await client.sendMessage(formattedRecipient, media);
      }

      // eslint-disable-next-line no-console
      botLogger.success(`✅ [BOT] Image sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const errorValidation = validateWhatsAppError(error instanceof Error ? error : new Error(String(error)));

      if (errorValidation.isPostSendError) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        botLogger.info(
          "✅ [BOT] Treating image send as successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      botLogger.error(`❌ [BOT] Error sending image to ${recipient}: ${error}`);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: errorValidation.errorType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { 
    messagesSent, 
    errors, 
    success: messagesSent.length > 0 
  };
}

/**
 * Send document message to multiple recipients
 */
export async function sendDocumentMessage(
  client: Client | null,
  recipients: string[],
  file: Express.Multer.File,
  message?: string
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error("WhatsApp client not initialized");
  }

  const media = createMessageMedia(file);

  for (const recipient of recipients) {
    try {
      const formattedRecipient = formatRecipient(recipient);
      // eslint-disable-next-line no-console
      botLogger.info(`📄 [BOT] Sending document to: ${formattedRecipient}`);

      // For documents, send the file first, then optionally send a message
      await client.sendMessage(formattedRecipient, media);

      if (message && message.trim()) {
        await client.sendMessage(formattedRecipient, message);
      }

      // eslint-disable-next-line no-console
      botLogger.success(
        `✅ [BOT] Document sent successfully to: ${formattedRecipient}`
      );
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const errorValidation = validateWhatsAppError(error instanceof Error ? error : new Error(String(error)));

      // Check if this is a post-send error using the classification
      const isPostSendError = errorValidation.isPostSendError;

      if (isPostSendError) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        botLogger.info(
          "✅ [BOT] Document send successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      botLogger.error(`❌ [BOT] Error sending document to ${recipient}: ${error}`);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: errorValidation.errorType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { 
    messagesSent, 
    errors, 
    success: messagesSent.length > 0 
  };
}

/**
 * Send audio message to multiple recipients
 */
export async function sendAudioMessage(
  client: Client | null,
  recipients: string[],
  file: Express.Multer.File,
  message?: string
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error("WhatsApp client not initialized");
  }

  const media = createMessageMedia(file);

  for (const recipient of recipients) {
    try {
      const formattedRecipient = formatRecipient(recipient);
      // eslint-disable-next-line no-console
      botLogger.info(`🎵 [BOT] Sending audio to: ${formattedRecipient}`);

      // For audio, send as voice message (ptt: true) or regular audio
      const options: any = { media };

      // Check if it's a voice note (ogg/opus usually indicates voice)
      if (file.mimetype === "audio/ogg" || file.mimetype === "audio/opus") {
        options.sendAudioAsVoice = true;
      }

      await client.sendMessage(formattedRecipient, "", options);

      if (message && message.trim()) {
        await client.sendMessage(formattedRecipient, message);
      }

      // eslint-disable-next-line no-console
      botLogger.success(`✅ [BOT] Audio sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const errorValidation = validateWhatsAppError(error instanceof Error ? error : new Error(String(error)));

      if (errorValidation.isPostSendError) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        botLogger.info(
          "✅ [BOT] Treating audio send as successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      botLogger.error(`❌ [BOT] Error sending audio to ${recipient}: ${error}`);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: errorValidation.errorType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { 
    messagesSent, 
    errors, 
    success: messagesSent.length > 0 
  };
}

/**
 * Send video message to multiple recipients
 */
export async function sendVideoMessage(
  client: Client | null,
  recipients: string[],
  file: Express.Multer.File,
  caption?: string
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error("WhatsApp client not initialized");
  }

  const media = createMessageMedia(file);

  for (const recipient of recipients) {
    try {
      const formattedRecipient = formatRecipient(recipient);
      // eslint-disable-next-line no-console
      botLogger.info(`🎬 [BOT] Sending video to: ${formattedRecipient}`);

      // For videos, WhatsApp uses sendMessage with media and optional caption
      if (caption && caption.trim()) {
        await client.sendMessage(formattedRecipient, caption, { media });
      } else {
        await client.sendMessage(formattedRecipient, media);
      }

      // eslint-disable-next-line no-console
      botLogger.success(`✅ [BOT] Video sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const errorValidation = validateWhatsAppError(error instanceof Error ? error : new Error(String(error)));

      if (errorValidation.isPostSendError) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        botLogger.info(
          "✅ [BOT] Treating video send as successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      botLogger.error(`❌ [BOT] Error sending video to ${recipient}: ${error}`);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: errorValidation.errorType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { 
    messagesSent, 
    errors, 
    success: messagesSent.length > 0 
  };
}
