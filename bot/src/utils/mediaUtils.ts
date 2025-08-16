/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageMedia } from 'whatsapp-web.js';

/**
 * Media utilities for WhatsApp message handling
 * Extracted from mediaHelpers for better organization
 */

/**
 * Helper function to get file extension from MIME type
 * @param mimeType MIME type string
 * @returns File extension without dot
 */
export function getExtensionFromMime(mimeType: string): string {
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
    'video/webm': 'webm',
  };
  
  return mimeToExt[mimeType] || 'bin';
}

/**
 * Helper function to determine file type and create MessageMedia
 * @param file Express.Multer.File object
 * @param filename Optional custom filename
 * @returns MessageMedia object
 */
export function createMessageMedia(
  file: Express.Multer.File, 
  filename?: string,
): MessageMedia {
  const actualFilename = filename || 
    file.originalname || 
    `file.${getExtensionFromMime(file.mimetype)}`;
  return new MessageMedia(
    file.mimetype, 
    file.buffer.toString('base64'), 
    actualFilename,
  );
}

/**
 * Helper function to create MessageMedia from legacy file format
 * Handles the format used by legacy sendFileAndMessage: 
 * { data: base64, mimetype: string }
 * @param legacyFile Legacy file object with data and mimetype
 * @param filename Optional custom filename
 * @returns MessageMedia object
 */
export function createMessageMediaFromLegacyFormat(
  legacyFile: { data: string; mimetype: string },
  filename?: string,
): MessageMedia {
  const actualFilename = filename || 
    `file.${getExtensionFromMime(legacyFile.mimetype)}`;
  return new MessageMedia(legacyFile.mimetype, legacyFile.data, actualFilename);
}

/**
 * Helper function to create MessageMedia from URL
 * @param imageUrl URL to the image
 * @param filename Optional custom filename
 * @returns Promise<MessageMedia>
 */
export async function createMessageMediaFromUrl(
  imageUrl: string, 
  filename?: string,
): Promise<MessageMedia> {
  try {
    const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
    if (filename) {
      media.filename = filename;
    }
    return media;
  } catch (error: any) {
    throw new Error(`Failed to load image from URL: ${error.message}`);
  }
}

/**
 * Check if a MIME type represents a voice message
 * @param mimeType MIME type string
 * @returns True if it's likely a voice message format
 */
export function isVoiceMessage(mimeType: string): boolean {
  return mimeType === 'audio/ogg' || mimeType === 'audio/opus';
}

/**
 * Get media type category from MIME type
 * @param mimeType MIME type string
 * @returns Media category (image, document, audio, video, other)
 */
export function getMediaCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) {
    return 'document';
  }
  return 'other';
}
