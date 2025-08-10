/**
 * Shared Core Types
 *
 * This module contains fundamental types used across multiple bot components
 * to prevent circular dependencies.
 */

// Core result types used by multiple utilities
export interface CoreResult {
  success: boolean;
  error?: string;
}

// Unified error object for all API responses
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

// Phone number result used by multiple utilities
export interface PhoneNumberValidation {
  cleanedPhoneNumber: string;
  isValid: boolean;
}

// Country configuration for phone number formatting
export interface CountryConfig {
  code: string;
  name: string;
  pattern: RegExp;
  formatter: (number: string) => string;
}

// Recipient processing types
export interface ProcessedRecipient {
  formatted: string;
  isValid: boolean;
  type: "phone" | "group" | "unknown";
}

// Request processing types
export interface RequestContext {
  requestId: string | number;
  timestamp: string;
  endpoint?: string;
}

// Media processing core types
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

// Error handling core types
export interface ErrorContext {
  recipient?: string;
  endpoint?: string;
  requestId?: string | number;
  timestamp: string;
}
