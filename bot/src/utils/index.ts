/**
 * Utils Barrel Export
 *
 * Central export for all bot utility functions
 */

// Core utilities
export { botLogger } from "./loggerWrapper";
export { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";

// Message handling utilities
export * from "./textMessaging";

// Recipient processing
export * from "./recipientFormattingUtils";

// Error handling
// Error handling utilities (pure functions)
export {
  validateErrorSeverity,
  isPostSendErrorType,
  categorizeErrorMessage,
  generateErrorDescription,
  getErrorSeverity,
  isRecoverableError,
  extractTroubleshootingInfo,
  calculateRetryDelay,
  formatErrorForLogging,
  createErrorSummary,
} from "./errorHandlerUtils";

// Validation utilities
// Note: RequestValidator moved to services/RequestValidationService

// Media utilities
export * from "./mediaUtils";

// Bot lifecycle utilities
export * from "./whatsAppUtils";
export * from "./apiUtils";
export * from "./browserUtils";
export * from "./shutdownUtils";

// Other utilities
export * from "./pm2Utils";
export * from "./groupUtils";
export * from "./messageFormatter";
