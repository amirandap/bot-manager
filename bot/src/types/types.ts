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
// ENVIRONMENT CONFIGURATION TYPES
// =================

export interface EnvironmentConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
  BOT_TYPE: string;
  NODE_ENV: string;
  CHROME_PATH: string;
  DATA_ROOT: string;
  SESSION_PATH: string;
  QR_PATH: string;
  LOGS_PATH: string;
}

// =================
// BOT LIFECYCLE TYPES
// =================

export enum BotLifecycleState {
  // Startup phases
  INITIALIZING = "initializing",
  BROWSER_LAUNCHING = "browser_launching",
  WAITING_FOR_QR = "waiting_for_qr",
  QR_READY = "qr_ready",
  QR_SCANNED = "qr_scanned",
  QR_ERROR = "qr_error",
  AUTHENTICATING = "authenticating",

  // Runtime states
  READY = "ready",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  LOADING = "loading",

  // Error states
  ERROR_VALIDATION = "error_validation",
  ERROR_CHROME = "error_chrome",
  ERROR_BROWSER = "error_browser",
  ERROR_CONNECTION = "error_connection",
  ERROR_AUTHENTICATION = "error_authentication",
  ERROR_UNKNOWN = "error_unknown",

  // Shutdown states
  STOPPING = "stopping",
  STOPPED = "stopped",
}

export interface LifecycleEvent {
  timestamp: string;
  state: BotLifecycleState;
  details?: string;
  error?: string;
}

// =================
// ERROR HANDLING TYPES
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

// Unified error object for all API responses
export interface ErrorObject {
  recipient: string;
  error: string;
  errorType?: string;
  timestamp?: string;
}

// =================
// PHONE NUMBER TYPES
// =================

import { PhoneNumberValidation } from "./core";

export interface PhoneNumberResult extends PhoneNumberValidation {
  // Inherits cleanedPhoneNumber and isValid from core
}

export interface CountryConfig {
  code: string;
  name: string;
  pattern: RegExp;
  formatter: (number: string) => string;
}

// =================
// MESSAGE TYPES
// =================

export type MessageType = "TEXT" | "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";

export interface MediaResult {
  messagesSent: string[];
  errors: ErrorObject[];
}

export interface SendMessageResult extends MediaResult {
  // Alias for backward compatibility
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

export interface MessageHandlerResult {
  success: boolean;
  messagesSent: string[];
  errors: ErrorObject[];
  fallbackSent?: boolean;
  troubleshootingGuide?: string;
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
// API REQUEST/RESPONSE TYPES
// =================

export interface BaseMessageRequestBody {
  discorduserid?: string;
  phoneNumber?: string | string[];
  to?: string | string[]; // Alias for phoneNumber
  group_id?: string;
  group_name?: string;
  message?: string; // Adding message for validation purposes
}

export interface SendMessageRequestBody extends BaseMessageRequestBody {
  message: string;
}

export interface MediaMessageRequestBody extends BaseMessageRequestBody {
  message?: string; // Optional caption/message for media
}

// Validation types
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

export interface ProcessingResult {
  messagesSent: string[];
  errors: ErrorObject[];
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
