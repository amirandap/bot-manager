/**
 * =================
 * BOT TYPES DEFINITION
 * =================
 * 
 * Consolidated type definitions for the WhatsApp Bot Manager
 * All types are organized in logical sections for easy navigation
 */

// =================
// CORE RESULT TYPES
// =================

export interface CoreResult {
  success: boolean;
  error?: string;
}

export interface ErrorObject {
  recipient: string;
  error: string;
  errorType: string;
  timestamp: string;
}

export interface MessageResult extends CoreResult {
  messagesSent: string[];
  errors: ErrorObject[];
}

// =================
// SYSTEM TYPES
// =================

export interface SystemError extends Error {
  code: string;
  errno?: number;
  syscall?: string;
  path?: string;
}

// =================
// ENVIRONMENT CONFIGURATION
// =================

export interface EnvironmentConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
  BOT_TYPE: string;
  NODE_ENV: string;
  CHROMIUM_PATH?: string; // Optional - uses bundled Chromium if not specified
  SILENT_METRICS: boolean;
  DEFAULT_FALLBACK_PHONE_NUMBER: string;
  DATA_ROOT: string;
  SESSION_PATH: string;
  QR_PATH: string;
  LOGS_PATH: string;
}

// =================
// BOT LIFECYCLE - DEPRECATED
// =================
// Bot lifecycle management now handled through direct logging with metrics
// No need for complex state management - LoggerService handles all state tracking

// =================
// ERROR HANDLING
// =================

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum ErrorCategory {
  // WhatsApp specific
  SESSION_ERROR = "SESSION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  RECIPIENT_ERROR = "RECIPIENT_ERROR",

  // Technical
  NETWORK_ERROR = "NETWORK_ERROR",
  BROWSER_ERROR = "BROWSER_ERROR",
  SERIALIZATION_ERROR = "SERIALIZATION_ERROR",

  // Application
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface WhatsAppError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  isPostSend: boolean;
  recipient?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlerOptions {
  enableFallback?: boolean;
  enableLogging?: boolean;
  retryCount?: number;
  context?: string;
}

export interface ErrorValidationResult {
  shouldIgnore: boolean;
  errorType: string;
  isPostSendError: boolean;
  description: string;
}

export interface DetailedErrorAnalysis {
  errorType: string;
  errorMessage: string;
  originalError: string;
  recipient?: string;
  originalRecipient?: string;
  timestamp: string;
  troubleshooting: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

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

export interface ErrorContext {
  recipient?: string;
  endpoint?: string;
  requestId?: string | number;
  timestamp: string;
}

// =================
// PHONE NUMBER HANDLING
// =================

export interface PhoneNumberValidation {
  cleanedPhoneNumber: string;
  isValid: boolean;
}

export interface PhoneNumberResult extends PhoneNumberValidation {
  // Inherits cleanedPhoneNumber and isValid
}

export interface CountryConfig {
  code: string;
  name: string;
  pattern: RegExp;
  formatter: (number: string) => string;
}

// =================
// RECIPIENT PROCESSING
// =================

export interface ProcessedRecipient {
  formatted: string;
  isValid: boolean;
  type: "phone" | "group" | "unknown";
}

export interface RequestContext {
  requestId: string | number;
  timestamp: string;
  endpoint?: string;
}

// =================
// MEDIA HANDLING
// =================

export interface MediaProcessingOptions {
  caption?: string;
  filename?: string;
  sendAudioAsVoice?: boolean;
}

export interface MediaAttachment {
  data: Buffer | string;
  mimetype: string;
  filename?: string;
}

export interface LegacyFileFormat {
  data: string; // base64
  mimetype: string;
}

export type MediaSource = Express.Multer.File | string | LegacyFileFormat;

// =================
// MESSAGE TYPES
// =================

export type MessageType = "TEXT" | "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";

export interface MessageSendOptions {
  caption?: string;
  filename?: string;
  sendAudioAsVoice?: boolean;
}

export interface MediaResult extends MessageResult {
  // Inherits messagesSent, errors from MessageResult
  // Inherits success, error from CoreResult
}

export interface SendMessageResult extends MediaResult {
  // Alias for backward compatibility
}

export interface MessageHandlerResult {
  success: boolean;
  messagesSent: string[];
  errors: ErrorObject[];
  fallbackSent?: boolean;
  troubleshootingGuide?: string;
}

export interface ProcessingResult extends MediaResult {
  // Inherits messagesSent, errors, success, error
}

// =================
// API REQUEST/RESPONSE
// =================

export interface BaseMessageRequestBody {
  discorduserid?: string;
  phoneNumber?: string | string[];
  to?: string | string[]; // Alias for phoneNumber
  group_id?: string;
  group_name?: string;
  message?: string; // Adding message for validation purposes
  caption?: string; // Adding caption for media messages
}

export interface SendMessageRequestBody extends BaseMessageRequestBody {
  message: string;
}

export interface MediaMessageRequestBody extends BaseMessageRequestBody {
  message?: string; // Optional caption/message for media
}

export interface ValidationResult {
  isValid: boolean;
  body?: BaseMessageRequestBody;
  file?: Express.Multer.File;
}

export interface RecipientValidationResult {
  isValid: boolean;
  body?: BaseMessageRequestBody;
}

export interface FileValidationResult {
  isValid: boolean;
  file?: Express.Multer.File;
  body?: BaseMessageRequestBody;
}

export interface SendResponse {
  success: boolean;
  messagesSent: string[];
  errors: ErrorObject[];
  totalSent: number;
  totalErrors: number;
}

export interface MediaSendResponse extends SendResponse {
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
}

// =================
// USER & PARTICIPANT TYPES
// =================

export type Participant = {
  name: string;
  phone: string;
  image: string;
  rank: number;
};

export interface User {
  user_id: number;
  full_name: string;
  username: string;
  nickname: string;
  email: string;
  user_discord_id: string;
  hearratelink?: string | null;
  youtube_id: string;
  iracing_id?: string | null;
  ea_ccount?: string | null;
  individualID: number;
  individual_id: number;
  SubmissionId: number;
  instagram: string;
  celular: string;
}

// =================
// TYPE UNIONS & GUARDS
// =================

export type AnyError = SystemError | WhatsAppError;
export type MessageRequest = SendMessageRequestBody | MediaMessageRequestBody;
export type ValidationResults =
  | ValidationResult
  | RecipientValidationResult
  | FileValidationResult;

// Type guards for runtime type checking
export function isWhatsAppError(error: unknown): error is WhatsAppError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "category" in error &&
      "severity" in error
  );
}

export function isSystemError(error: unknown): error is SystemError {
  return Boolean(error && typeof error === "object" && "code" in error);
}

export function isMediaRequest(body: unknown): body is MediaMessageRequestBody {
  const bodyObj = body as Record<string, unknown>;
  return Boolean(
    body &&
      typeof body === "object" &&
      !("message" in bodyObj && typeof bodyObj.message === "string")
  );
}

export function isTextRequest(body: unknown): body is SendMessageRequestBody {
  const bodyObj = body as Record<string, unknown>;
  return Boolean(
    body &&
      typeof body === "object" &&
      "message" in bodyObj &&
      typeof bodyObj.message === "string"
  );
}
