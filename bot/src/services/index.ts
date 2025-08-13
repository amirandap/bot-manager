/**
 * Services Barrel Export
 *
 * CONSOLIDATED - Eliminates duplicated services:
 * - Logger moved to services/LoggerService.ts
 * - StartupManager moved to utils/startupUtils.ts
 */

// Core logging service
export { LoggerService, LogLevel, LoggerConfig } from "./LoggerService";

// Remaining specialized services
export { DirectoryManagerService } from "./DirectoryManagerService";

// User and messaging services
export * from "./UserDataService";
export * from "./MediaMessagingService";
export * from "./SMTPService";

// Request validation service
export { RequestValidationService } from "./RequestValidationService";

// Recipient processing service  
export { RecipientProcessorService } from "./RecipientProcessorService";

// Error handling services
export { 
  WhatsAppErrorHandlerService, 
  MessageErrorHandlerService 
} from "./WhatsAppErrorHandlerService";
