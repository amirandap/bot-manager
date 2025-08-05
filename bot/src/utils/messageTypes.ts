/**
 * Common types and interfaces for message sending operations
 * Consolidated from various mediaHelpers exports
 */

export interface MediaResult {
  messagesSent: string[];
  errors: Array<{
    recipient: string;
    error: string;
    errorType: string;
    timestamp: string;
  }>;
}

export interface SendMessageResult extends MediaResult {
  // Alias for backward compatibility
}

export interface ErrorDetail {
  recipient: string;
  error: string;
  errorType: string;
  timestamp: string;
}

export interface MessageSendOptions {
  caption?: string;
  filename?: string;
  sendAudioAsVoice?: boolean;
}

export interface LegacyFileFormat {
  data: string; // base64
  mimetype: string;
}

export type MediaSource = Express.Multer.File | string | LegacyFileFormat;

export interface CriticalErrorDetails {
  endpoint: string;
  errorType: string;
  error: string;
  payload: Record<string, unknown>;
  timestamp: string;
  isPostSendError: boolean;
  shouldIgnore: boolean;
  description: string;
  troubleshooting: {
    commonCauses: string[];
    suggestedActions: string[];
  };
}
