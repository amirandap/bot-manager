/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, MessageMedia } from "whatsapp-web.js";
import { formatRecipient } from "../utils/recipientFormatting";
import { WhatsAppErrorHandler } from "../utils/errorHandler";
import { createMessageMedia, createMessageMediaFromUrl } from "../utils/mediaUtils";
import { MediaResult } from "../types/types";

/**
 * Media messaging service
 * Updated to use the new centralized error handler
 */

// Get error handler instance
const errorHandler = WhatsAppErrorHandler.getInstance();

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
      console.log(`🖼️ [BOT] Sending image to: ${formattedRecipient}`);

      // For images, WhatsApp uses sendMessage with media and optional caption
      if (caption && caption.trim()) {
        await client.sendMessage(formattedRecipient, caption, { media });
      } else {
        await client.sendMessage(formattedRecipient, media);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ [BOT] Image sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const whatsappError = await errorHandler.handle(error, client, {
        context: "IMAGE_MESSAGE",
        enableFallback: false, // We handle errors manually here
      });

      if (whatsappError.isPostSend) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log(
          "✅ [BOT] Treating image send as successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending image to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: whatsappError.category,
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
      console.log(`📄 [BOT] Sending document to: ${formattedRecipient}`);

      // For documents, send the file first, then optionally send a message
      await client.sendMessage(formattedRecipient, media);

      if (message && message.trim()) {
        await client.sendMessage(formattedRecipient, message);
      }

      // eslint-disable-next-line no-console
      console.log(
        `✅ [BOT] Document sent successfully to: ${formattedRecipient}`
      );
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const whatsappError = await errorHandler.handle(error, client, {
        context: "DOCUMENT_MESSAGE",
        enableFallback: false, // We handle errors manually here
      });

      if (whatsappError.isPostSend) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log(
          "✅ [BOT] Document send successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending document to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: whatsappError.category,
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
      console.log(`🎵 [BOT] Sending audio to: ${formattedRecipient}`);

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
      console.log(`✅ [BOT] Audio sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const whatsappError = await errorHandler.handle(error, client, {
        context: "AUDIO_MESSAGE",
        enableFallback: false, // We handle errors manually here
      });

      if (whatsappError.isPostSend) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log(
          "✅ [BOT] Treating audio send as successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending audio to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: whatsappError.category,
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
      console.log(`🎬 [BOT] Sending video to: ${formattedRecipient}`);

      // For videos, WhatsApp uses sendMessage with media and optional caption
      if (caption && caption.trim()) {
        await client.sendMessage(formattedRecipient, caption, { media });
      } else {
        await client.sendMessage(formattedRecipient, media);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ [BOT] Video sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);
    } catch (error: any) {
      // Use the new error handler to classify and handle the error
      const whatsappError = await errorHandler.handle(error, client, {
        context: "VIDEO_MESSAGE",
        enableFallback: false, // We handle errors manually here
      });

      if (whatsappError.isPostSend) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log(
          "✅ [BOT] Treating video send as successful despite post-send error"
        );
        continue;
      }

      // Critical error - actual delivery failure
      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending video to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: whatsappError.category,
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
