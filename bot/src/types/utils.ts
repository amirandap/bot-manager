/**
 * =================
 * UTILITY TYPES
 * =================
 * 
 * All utility-related types centralized
 */

// =================
// MEDIA UTILITIES
// =================

export type DetectedMediaType = "image" | "document" | "audio" | "video" | "text";

// =================
// CONTROLLER UTILITIES
// =================

export interface ClientValidationResult {
  client: unknown; // WhatsApp Web Client instance - external library type
  requestId: string;
}

export interface MessageSendResults {
  messagesSent: string[];
  errors: unknown[]; // Error objects - flexible structure from external libraries
}

export interface ControllerResponse {
  statusCode: number;
  response: import('./types').SendResponse | import('./types').MediaSendResponse;
}

export interface MediaSupportValidation {
  isSupported: boolean;
  reason?: string;
}

export interface LegacyMediaFile {
  data: string; // base64
  mimetype: string;
}

// =================
// CACHE UTILITIES
// =================

export interface CacheInfo {
  exists: boolean;
  size: number;
  files: number;
}

// =================
// MAPS AND DICTIONARIES
// =================

export interface MimeExtensionMap {
  [key: string]: string;
}

export interface ChromiumPathMap {
  [key: string]: string[];
}

export interface EnvironmentArgsMap {
  [key: string]: {
    additionalArgs: string[];
    enableLogging: boolean;
  };
}