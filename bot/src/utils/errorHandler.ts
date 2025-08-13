/**
 * ERROR HANDLER UTILITIES - SIMPLIFIED VERSION
 * 
 * THIS FILE HAS BEEN REFACTORED:
 * - Classes moved to services/WhatsAppErrorHandlerService.ts
 * - Pure functions moved to utils/errorHandlerUtils.ts
 * - This file maintains backward compatibility
 */

import {
  validateErrorSeverity,
  categorizeErrorMessage,
  generateErrorDescription,
  getErrorSeverity,
  isPostSendErrorType,
} from "./errorHandlerUtils";
import { 
  WhatsAppErrorHandlerService, 
  MessageErrorHandlerService 
} from "../services/WhatsAppErrorHandlerService";
import { ErrorCategory, ErrorSeverity, DetailedErrorAnalysis } from "../types";
import { Client } from "whatsapp-web.js";

// ============================================================================
// BACKWARD COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * @deprecated Use validateErrorSeverity from utils/errorHandlerUtils.ts
 */
export function validateWhatsAppError(error: Error) {
  return validateErrorSeverity(error);
}

/**
 * @deprecated Use isPostSendErrorType from utils/errorHandlerUtils.ts
 */
export function shouldSendFallback(error: Error): boolean {
  return !isPostSendErrorType(error);
}

/**
 * @deprecated Use botLogger directly
 */
export function logWhatsAppError(error: Error, context?: string): void {
  console.error(`[ERROR_HANDLER] ${context || 'Unknown'}: ${error.message}`);
}

/**
 * @deprecated Use categorizeErrorMessage from utils/errorHandlerUtils.ts
 */
export function categorizeError(
  error: unknown,
  recipient?: string,
  originalRecipient?: string
): DetailedErrorAnalysis {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  return {
    errorType: categorizeErrorMessage(errorObj.message),
    errorMessage: errorObj.message,
    originalError: errorObj.message,
    recipient,
    originalRecipient,
    timestamp: new Date().toISOString(),
    troubleshooting: generateErrorDescription(errorObj, categorizeErrorMessage(errorObj.message)),
    severity: getErrorSeverity(errorObj),
  };
}

/**
 * @deprecated Use botLogger directly  
 */
export function sendErrorMessage(message: string): void {
  console.error(`[ERROR_MESSAGE] ${message}`);
}

// ============================================================================
// BACKWARD COMPATIBILITY CLASSES
// ============================================================================

/**
 * @deprecated Use WhatsAppErrorHandlerService from services
 */
export class WhatsAppErrorClassifier {
  public static classifyError(error: Error) {
    const category = categorizeErrorMessage(error.message);
    const severity = getErrorSeverity(error);
    
    return {
      category,
      severity,
      isRecoverable: !isPostSendErrorType(error),
      description: generateErrorDescription(error, category),
    };
  }
}

/**
 * @deprecated Use WhatsAppErrorHandlerService from services
 */
export class WhatsAppErrorHandler {
  private static instance: WhatsAppErrorHandler;
  private service: WhatsAppErrorHandlerService;

  private constructor() {
    this.service = new WhatsAppErrorHandlerService();
  }

  public static getInstance(): WhatsAppErrorHandler {
    if (!WhatsAppErrorHandler.instance) {
      WhatsAppErrorHandler.instance = new WhatsAppErrorHandler();
    }
    return WhatsAppErrorHandler.instance;
  }

  public async handle(error: unknown, client?: Client | null, options = {}) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return this.service.handleError(errorObj, "legacy", options);
  }
}

/**
 * @deprecated Use MessageErrorHandlerService from services
 */
export class MessageErrorHandler {
  private static service = new MessageErrorHandlerService();

  public static async handleCriticalError(
    client: Client | null,
    error: unknown,
    requestBody: Record<string, unknown>,
    endpoint: string = "message-endpoint"
  ): Promise<{
    errorType: string;
    errorMessage: string;
    errorDetails: DetailedErrorAnalysis;
  }> {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    const result = await this.service.handleMessageError(
      errorObj,
      endpoint,
      JSON.stringify(requestBody)
    );

    const errorDetails = categorizeError(error);

    return {
      errorType: errorDetails.errorType,
      errorMessage: result.errorMessage,
      errorDetails,
    };
  }

  public static async sendErrorReport(
    client: Client | null,
    requestBody: Record<string, unknown>,
    errors: Array<{
      recipient: string;
      error: string;
      errorType: string;
      timestamp: string;
    }>,
    endpoint: string = "message-endpoint"
  ): Promise<void> {
    // Simple logging implementation
    if (errors.length > 0) {
      console.error(`Error report for ${endpoint}:`, {
        payload: requestBody,
        errors: errors
      });
    }
  }
}
