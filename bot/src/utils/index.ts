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
export * from "./recipientFormatting";

// Error handling
export { 
  WhatsAppErrorHandler, 
  MessageErrorHandler, 
  sendErrorMessage, 
  shouldSendFallback, 
  validateWhatsAppError 
} from "./errorHandler";

// Validation utilities
export { default as RequestValidator } from "./requestValidator";

// Media utilities
export * from "./mediaUtils";

// Bot lifecycle utilities
export * from "./whatsAppUtils";
export * from "./qrUtils";
export * from "./apiUtils";
export * from "./browserUtils";

// Other utilities
export * from "./pm2Utils";
export * from "./groupUtils";
export * from "./messageFormatter";
