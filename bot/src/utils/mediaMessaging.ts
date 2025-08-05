/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, MessageMedia } from 'whatsapp-web.js';
import { formatRecipient } from './recipientFormatting';
import { shouldSendFallback } from './errorHandler';
import { createMessageMedia, createMessageMediaFromUrl } from './mediaUtils';
import { MediaResult } from './messageTypes';

/**
 * Media messaging utilities
 * Extracted from mediaHelpers for better organization
 */

/**
 * Send image message to multiple recipients
 * Supports both uploaded files and URLs
 */
export async function sendImageMessage(
  client: Client | null,
  recipients: string[],
  source: Express.Multer.File | string, // File object or URL string
  caption?: string,
  filename?: string,
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error('WhatsApp client not initialized');
  }

  let media: MessageMedia;
  
  try {
    // Determine if source is a file or URL
    if (typeof source === 'string') {
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
      const sendFallback = shouldSendFallback(error, 'IMAGE_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log('✅ [BOT] Treating image send as successful despite post-send error');
        continue;
      }

      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending image to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'IMAGE_SEND_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { messagesSent, errors };
}

/**
 * Send document message to multiple recipients
 */
export async function sendDocumentMessage(
  client: Client | null,
  recipients: string[],
  file: Express.Multer.File,
  message?: string,
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error('WhatsApp client not initialized');
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
      console.log(`✅ [BOT] Document sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);

    } catch (error: any) {
      const sendFallback = shouldSendFallback(error, 'DOCUMENT_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log('✅ [BOT] Treating document send as successful despite post-send error');
        continue;
      }

      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending document to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'DOCUMENT_SEND_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { messagesSent, errors };
}

/**
 * Send audio message to multiple recipients
 */
export async function sendAudioMessage(
  client: Client | null,
  recipients: string[],
  file: Express.Multer.File,
  message?: string,
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error('WhatsApp client not initialized');
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
      if (file.mimetype === 'audio/ogg' || file.mimetype === 'audio/opus') {
        options.sendAudioAsVoice = true;
      }

      await client.sendMessage(formattedRecipient, '', options);
      
      if (message && message.trim()) {
        await client.sendMessage(formattedRecipient, message);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ [BOT] Audio sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);

    } catch (error: any) {
      const sendFallback = shouldSendFallback(error, 'AUDIO_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log('✅ [BOT] Treating audio send as successful despite post-send error');
        continue;
      }

      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending audio to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'AUDIO_SEND_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { messagesSent, errors };
}

/**
 * Send video message to multiple recipients
 */
export async function sendVideoMessage(
  client: Client | null,
  recipients: string[],
  file: Express.Multer.File,
  caption?: string,
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: any[] = [];

  if (!client) {
    throw new Error('WhatsApp client not initialized');
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
      const sendFallback = shouldSendFallback(error, 'VIDEO_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        // eslint-disable-next-line no-console
        console.log('✅ [BOT] Treating video send as successful despite post-send error');
        continue;
      }

      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending video to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'VIDEO_SEND_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { messagesSent, errors };
}
