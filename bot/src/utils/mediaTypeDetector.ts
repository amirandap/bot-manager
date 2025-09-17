/**
 * Media Type Detection Utilities
 * Automatically detects media type based on file properties
 */

import { logger } from "../services/LoggerService";
import { DetectedMediaType } from "../types/utils";

/**
 * Detect media type based on file MIME type and extension
 * @param file Express Multer file object
 * @returns Detected media type for WhatsApp
 */
export function detectMediaType(file: Express.Multer.File): DetectedMediaType {
  const mimeType = file.mimetype.toLowerCase();
  const fileName = file.originalname.toLowerCase();
  
  logger.info(`Detecting media type for file: ${fileName}, MIME: ${mimeType}`);

  // Image detection
  if (mimeType.startsWith('image/')) {
    logger.info(`Detected as IMAGE: ${mimeType}`);
    return "image";
  }

  // Video detection
  if (mimeType.startsWith('video/') || 
      fileName.endsWith('.mp4') || 
      fileName.endsWith('.avi') || 
      fileName.endsWith('.mov') || 
      fileName.endsWith('.wmv') || 
      fileName.endsWith('.flv') || 
      fileName.endsWith('.webm') || 
      fileName.endsWith('.mkv') || 
      fileName.endsWith('.3gp')) {
    logger.info(`Detected as VIDEO: ${mimeType}`);
    return "video";
  }

  // Audio detection
  if (mimeType.startsWith('audio/') || 
      fileName.endsWith('.mp3') || 
      fileName.endsWith('.wav') || 
      fileName.endsWith('.ogg') || 
      fileName.endsWith('.aac') || 
      fileName.endsWith('.flac') || 
      fileName.endsWith('.m4a') || 
      fileName.endsWith('.amr') || 
      fileName.endsWith('.opus')) {
    logger.info(`Detected as AUDIO: ${mimeType}`);
    return "audio";
  }

  // Everything else is treated as document
  logger.info(`Detected as DOCUMENT: ${mimeType}`);
  return "document";
}

/**
 * Get appropriate caption/message field name based on media type
 * @param mediaType Detected media type
 * @returns Field name to use for text content
 */
export function getTextFieldForMediaType(mediaType: DetectedMediaType): string {
  switch (mediaType) {
    case "image":
    case "video":
      return "caption";
    case "audio":
    case "document":
      return "message";
    default:
      return "message";
  }
}

/**
 * Validate if media type is supported by WhatsApp
 * @param mediaType Detected media type
 * @param mimeType Original MIME type
 * @returns Validation result with details
 */
export function validateMediaTypeSupport(
  mediaType: DetectedMediaType, 
  mimeType: string
): { isSupported: boolean; reason?: string } {
  
  // WhatsApp supported formats
  const supportedFormats = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/3gpp', 'video/quicktime', 'video/x-ms-wmv'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/amr'],
    document: ['*'] // Documents accept most formats
  };

  if (mediaType === 'text') {
    return { isSupported: true };
  }

  const supported = supportedFormats[mediaType as keyof typeof supportedFormats];
  
  if (supported.includes('*') || supported.includes(mimeType)) {
    return { isSupported: true };
  }

  return { 
    isSupported: false, 
    reason: `MIME type ${mimeType} not supported for ${mediaType} messages in WhatsApp` 
  };
}

/**
 * Get file size limits for different media types (in bytes)
 * @param mediaType Media type
 * @returns Maximum file size in bytes
 */
export function getFileSizeLimit(mediaType: DetectedMediaType): number {
  const limits = {
    image: 16 * 1024 * 1024,    // 16MB
    video: 64 * 1024 * 1024,    // 64MB
    audio: 16 * 1024 * 1024,    // 16MB
    document: 100 * 1024 * 1024, // 100MB
    text: 0 // No file
  };

  return limits[mediaType];
}
