/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
import { Client, MessageMedia } from "whatsapp-web.js";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { shouldSendFallback } from "../utils/errorHandler";

export interface MediaResult {
  messagesSent: string[];
  errors: Array<{
    recipient: string;
    error: string;
    errorType: string;
    timestamp: string;
  }>;
}

/**
 * Helper function to format recipient (phone or group)
 */
function formatRecipient(recipient: string): string {
  if (recipient.includes('@g.us')) {
    // It's a group ID, return as-is
    return recipient;
  } else {
    // It's a phone number, format for WhatsApp
    const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(recipient);
    const whatsappNumber = cleanedPhoneNumber.startsWith("+")
      ? cleanedPhoneNumber.slice(1)
      : cleanedPhoneNumber;
    return `${whatsappNumber.trim()}@c.us`;
  }
}

/**
 * Helper function to determine file type and create MessageMedia
 */
function createMessageMedia(file: Express.Multer.File, filename?: string): MessageMedia {
  const actualFilename = filename || file.originalname || `file.${getExtensionFromMime(file.mimetype)}`;
  return new MessageMedia(file.mimetype, file.buffer.toString("base64"), actualFilename);
}

/**
 * Helper function to get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: { [key: string]: string } = {
    // Images
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg', 
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/aac': 'aac',
    
    // Video
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/mov': 'mov',
    'video/wmv': 'wmv',
    'video/webm': 'webm'
  };
  
  return mimeToExt[mimeType] || 'bin';
}

/**
 * Send image message to multiple recipients
 */
export async function sendImageMessage(
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
      console.log(`🖼️ [BOT] Sending image to: ${formattedRecipient}`);

      // For images, WhatsApp uses sendMessage with media and optional caption
      let messageResult;
      if (caption && caption.trim()) {
        messageResult = await client.sendMessage(formattedRecipient, caption, { media });
      } else {
        messageResult = await client.sendMessage(formattedRecipient, media);
      }

      console.log(`✅ [BOT] Image sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);

    } catch (error: any) {
      const sendFallback = shouldSendFallback(error, 'IMAGE_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        console.log(`✅ [BOT] Treating image send as successful despite post-send error`);
        continue;
      }

      console.error(`❌ [BOT] Error sending image to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'IMAGE_SEND_ERROR',
        timestamp: new Date().toISOString()
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
      console.log(`📄 [BOT] Sending document to: ${formattedRecipient}`);

      // For documents, send the file first, then optionally send a message
      await client.sendMessage(formattedRecipient, media);
      
      if (message && message.trim()) {
        await client.sendMessage(formattedRecipient, message);
      }

      console.log(`✅ [BOT] Document sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);

    } catch (error: any) {
      const sendFallback = shouldSendFallback(error, 'DOCUMENT_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        console.log(`✅ [BOT] Treating document send as successful despite post-send error`);
        continue;
      }

      console.error(`❌ [BOT] Error sending document to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'DOCUMENT_SEND_ERROR',
        timestamp: new Date().toISOString()
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

      console.log(`✅ [BOT] Audio sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);

    } catch (error: any) {
      const sendFallback = shouldSendFallback(error, 'AUDIO_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        console.log(`✅ [BOT] Treating audio send as successful despite post-send error`);
        continue;
      }

      console.error(`❌ [BOT] Error sending audio to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'AUDIO_SEND_ERROR',
        timestamp: new Date().toISOString()
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
      console.log(`🎬 [BOT] Sending video to: ${formattedRecipient}`);

      // For videos, WhatsApp uses sendMessage with media and optional caption
      let messageResult;
      if (caption && caption.trim()) {
        messageResult = await client.sendMessage(formattedRecipient, caption, { media });
      } else {
        messageResult = await client.sendMessage(formattedRecipient, media);
      }

      console.log(`✅ [BOT] Video sent successfully to: ${formattedRecipient}`);
      messagesSent.push(formattedRecipient);

    } catch (error: any) {
      const sendFallback = shouldSendFallback(error, 'VIDEO_MESSAGE', recipient);
      
      if (!sendFallback) {
        // Post-send error - message was likely delivered
        messagesSent.push(recipient);
        console.log(`✅ [BOT] Treating video send as successful despite post-send error`);
        continue;
      }

      console.error(`❌ [BOT] Error sending video to ${recipient}:`, error);
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'VIDEO_SEND_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  return { messagesSent, errors };
}
