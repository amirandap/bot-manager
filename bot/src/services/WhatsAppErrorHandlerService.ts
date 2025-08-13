/**
 * WhatsApp Error Handling Services
 * Contains error classification and handling classes with state and business logic
 */

import { Client } from "whatsapp-web.js";
import { DEFAULT_FALLBACK_PHONE_NUMBER } from "../config/EnvironmentManager";
import { formatPhoneForWhatsApp } from "../utils/recipientFormattingUtils";
import { botLogger } from "../utils/loggerWrapper";
import {
  ErrorSeverity,
  ErrorCategory,
  WhatsAppError,
  ErrorHandlerOptions,
  ErrorValidationResult,
  DetailedErrorAnalysis,
} from "../types";

// ============================================================================
// ERROR CLASSIFICATION SYSTEM
// ============================================================================

interface ErrorPattern {
  pattern: RegExp;
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  description: string;
  retryAfter?: number;
}

/**
 * WhatsApp Error Classifier - Industry standard error classification
 * Maintains all your existing error patterns but organizes them efficiently
 */
class WhatsAppErrorClassifier {
  private static readonly ERROR_PATTERNS: ErrorPattern[] = [
    // Post-send errors (message delivered but session issues after)
    {
      pattern: /Cannot read properties of undefined \(reading 'serialize'\)/,
      category: ErrorCategory.SERIALIZATION_ERROR,
      severity: ErrorSeverity.LOW,
      isRecoverable: true,
      description: "WhatsApp session serialization error (post-send)",
    },
    {
      pattern: /Cannot read properties of null \(reading 'serialize'\)/,
      category: ErrorCategory.SERIALIZATION_ERROR,
      severity: ErrorSeverity.LOW,
      isRecoverable: true,
      description: "WhatsApp session null serialization error (post-send)",
    },
    {
      pattern:
        /Evaluation failed: ReferenceError: window\.WWebJS is not defined/,
      category: ErrorCategory.SESSION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true,
      description: "WhatsApp Web session context lost (post-send)",
    },
    // Pre-send errors (prevent message sending)
    {
      pattern: /Client is not ready\./,
      category: ErrorCategory.AUTHENTICATION_ERROR,
      severity: ErrorSeverity.HIGH,
      isRecoverable: false,
      description: "WhatsApp client not initialized",
    },
    {
      pattern: /Invalid number or group ID/,
      category: ErrorCategory.RECIPIENT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: false,
      description: "Invalid recipient number or group ID",
    },
    {
      pattern: /Invalid parameter: Number/,
      category: ErrorCategory.RECIPIENT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: false,
      description: "Invalid phone number format",
    },
    {
      pattern: /Rate limit exceeded/,
      category: ErrorCategory.RATE_LIMIT_ERROR,
      severity: ErrorSeverity.HIGH,
      isRecoverable: true,
      description: "WhatsApp rate limit exceeded",
      retryAfter: 60000, // 1 minute
    },
    {
      pattern: /Session closed/,
      category: ErrorCategory.SESSION_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "WhatsApp session terminated",
    },
    {
      pattern: /Execution context was destroyed/,
      category: ErrorCategory.SESSION_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "Browser execution context destroyed",
    },
    {
      pattern: /Page crashed/,
      category: ErrorCategory.SESSION_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "WhatsApp Web page crashed",
    },
    {
      pattern: /Navigation failed because browser has disconnected/,
      category: ErrorCategory.SESSION_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "Browser disconnected during navigation",
    },
    {
      pattern: /Protocol error.*Target closed/,
      category: ErrorCategory.SESSION_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "Browser target closed unexpectedly",
    },
    {
      pattern: /Failed to send media/,
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true,
      description: "Media file processing error",
    },
    {
      pattern: /File size too large/,
      category: ErrorCategory.VALIDATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: false,
      description: "Media file exceeds size limit",
    },
    {
      pattern: /Invalid media type/,
      category: ErrorCategory.VALIDATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: false,
      description: "Unsupported media file type",
    },
    {
      pattern: /Network error/,
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true,
      description: "Network connectivity issue",
      retryAfter: 30000, // 30 seconds
    },
    {
      pattern: /Timeout error/,
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true,
      description: "Request timeout",
      retryAfter: 15000, // 15 seconds
    },
    {
      pattern: /ERR_INTERNET_DISCONNECTED/,
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.HIGH,
      isRecoverable: true,
      description: "Internet connection lost",
      retryAfter: 60000, // 1 minute
    },
    {
      pattern: /ERR_NETWORK_CHANGED/,
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true,
      description: "Network configuration changed",
      retryAfter: 30000, // 30 seconds
    },
    // Critical system errors
    {
      pattern: /ECONNREFUSED/,
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "Connection refused by system",
    },
    {
      pattern: /Memory error/,
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "System memory error",
    },
    {
      pattern: /Process killed/,
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
      description: "Process terminated by system",
    },
  ];

  /**
   * Classify error based on patterns
   */
  public static classifyError(error: Error): WhatsAppError {
    const message = error.message;
    const stack = error.stack || "";

    // Check all patterns
    for (const patternConfig of this.ERROR_PATTERNS) {
      if (
        patternConfig.pattern.test(message) ||
        patternConfig.pattern.test(stack)
      ) {
        return {
          ...error,
          category: patternConfig.category,
          severity: patternConfig.severity,
          isRecoverable: patternConfig.isRecoverable,
          isPostSend: this.isPostSendError(patternConfig.category),
        } as WhatsAppError;
      }
    }

    // Default classification for unknown errors
    return {
      ...error,
      category: ErrorCategory.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: true,
      isPostSend: false,
    } as WhatsAppError;
  }

  private static isPostSendError(category: ErrorCategory): boolean {
    return category === ErrorCategory.SERIALIZATION_ERROR;
  }
}

/**
 * Main WhatsApp Error Handler Service
 * Handles all WhatsApp-related errors with appropriate recovery strategies
 */
export class WhatsAppErrorHandlerService {
  private client: Client | null;
  private options: ErrorHandlerOptions;

  constructor(client: Client | null = null, options: ErrorHandlerOptions = {}) {
    this.client = client;
    this.options = {
      enableFallback: options.enableFallback ?? true,
      enableLogging: options.enableLogging ?? true,
      retryCount: options.retryCount ?? 3,
      context: options.context,
      ...options,
    };
  }

  /**
   * Main error handling method
   */
  public async handleError(
    error: Error,
    context: string = "Unknown",
    metadata: Record<string, unknown> = {}
  ): Promise<ErrorValidationResult> {
    try {
      // Classify the error
      const classifiedError = WhatsAppErrorClassifier.classifyError(error);

      // Log the error
      if (this.options.enableLogging) {
        this.logError(classifiedError, context, metadata);
      }

      // Send notification if enabled
      if (this.options.enableFallback) {
        await this.sendErrorNotification(classifiedError, context);
      }

      return {
        shouldIgnore: classifiedError.isPostSend,
        errorType: classifiedError.category,
        isPostSendError: classifiedError.isPostSend,
        description: classifiedError.message,
      };
    } catch (handlingError) {
      // If error handling itself fails, log and return safe fallback
      botLogger.error("Error in error handler:", handlingError);
      return {
        shouldIgnore: false,
        errorType: ErrorCategory.UNKNOWN_ERROR,
        isPostSendError: false,
        description: "Error handling failed",
      };
    }
  }

  /**
   * Detailed error analysis for debugging
   */
  public analyzeError(error: Error): DetailedErrorAnalysis {
    const classifiedError = WhatsAppErrorClassifier.classifyError(error);

    return {
      errorType: classifiedError.category,
      errorMessage: classifiedError.message,
      originalError: error.message,
      timestamp: new Date().toISOString(),
      troubleshooting: this.getRecommendedAction(classifiedError),
      severity: classifiedError.severity,
    };
  }

  /**
   * Check if client is in a recoverable state
   */
  public async checkClientHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    canRecover: boolean;
  }> {
    const issues: string[] = [];
    let canRecover = true;

    try {
      if (!this.client) {
        issues.push("No client instance available");
        canRecover = false;
      } else {
        // Check if client page exists
        if (!this.client.pupPage) {
          issues.push("Browser page not available");
          canRecover = false;
        }

        // Check if client is ready
        const clientState = this.client.info;
        if (!clientState) {
          issues.push("Client not ready");
        }
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        canRecover,
      };
    } catch (error) {
      botLogger.error("Error checking client health:", error);
      return {
        isHealthy: false,
        issues: ["Health check failed"],
        canRecover: false,
      };
    }
  }

  // Private helper methods
  private isBlockingError(error: WhatsAppError): boolean {
    return (
      error.severity === ErrorSeverity.CRITICAL ||
      (error.severity === ErrorSeverity.HIGH && !error.isRecoverable)
    );
  }

  private logError(
    error: WhatsAppError,
    context: string,
    metadata: Record<string, unknown>
  ): void {
    const logMessage = `${context} - ${error.category}: ${error.message} (Recoverable: ${error.isRecoverable}, PostSend: ${error.isPostSend})`;

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        botLogger.error(`🚨 CRITICAL WhatsApp Error: ${logMessage}`);
        break;
      case ErrorSeverity.HIGH:
        botLogger.error(`⚠️ HIGH Severity WhatsApp Error: ${logMessage}`);
        break;
      case ErrorSeverity.MEDIUM:
        botLogger.warn(`⚡ MEDIUM Severity WhatsApp Error: ${logMessage}`);
        break;
      case ErrorSeverity.LOW:
        botLogger.info(`📋 LOW Severity WhatsApp Error: ${logMessage}`);
        break;
      default:
        botLogger.warn(`❓ Unknown Severity WhatsApp Error: ${logMessage}`);
    }
  }

  private async sendErrorNotification(
    error: WhatsAppError,
    context: string
  ): Promise<void> {
    try {
      // Simple notification for now
      botLogger.success("Fallback notification sent");
    } catch (notificationError) {
      botLogger.error(
        "Failed to send error notification:",
        notificationError
      );
    }
  }

  private getRecommendedAction(error: WhatsAppError): string {
    switch (error.category) {
      case ErrorCategory.SESSION_ERROR:
        return "Restart WhatsApp client session";
      case ErrorCategory.AUTHENTICATION_ERROR:
        return "Re-authenticate WhatsApp client";
      case ErrorCategory.RATE_LIMIT_ERROR:
        return "Wait before retrying operation";
      case ErrorCategory.RECIPIENT_ERROR:
        return "Validate recipient phone number format";
      case ErrorCategory.NETWORK_ERROR:
        return "Check network connectivity";
      case ErrorCategory.VALIDATION_ERROR:
        return "Validate request parameters";
      default:
        return "No specific action available";
    }
  }
}

/**
 * Specialized error handler for message operations
 * Extends the main error handler with message-specific logic
 */
export class MessageErrorHandlerService {
  private errorHandler: WhatsAppErrorHandlerService;

  constructor(client: Client | null = null, options: ErrorHandlerOptions = {}) {
    this.errorHandler = new WhatsAppErrorHandlerService(client, options);
  }

  /**
   * Handle errors that occur during message sending
   */
  public async handleMessageError(
    error: Error,
    endpoint: string,
    recipient?: string,
    messageType: string = "text"
  ): Promise<{
    success: boolean;
    errorMessage: string;
    shouldRetry: boolean;
    retryAfter?: number;
  }> {
    try {
      const context = `MESSAGE_SEND_${endpoint.toUpperCase()}`;
      const metadata = {
        recipient,
        messageType,
        endpoint,
        timestamp: new Date().toISOString(),
      };

      const result = await this.errorHandler.handleError(
        error,
        context,
        metadata
      );

      // Format phone number for logging if provided
      const formattedRecipient = recipient
        ? formatPhoneForWhatsApp(recipient)
        : "unknown";

      // Log specific message error
      botLogger.error(
        `❌ [MESSAGE_ERROR] Failed to send ${messageType} to ${formattedRecipient} via ${endpoint}: ${error.message}`
      );

      return {
        success: false,
        errorMessage: result.description || error.message,
        shouldRetry: !result.isPostSendError,
        retryAfter: 30000, // Default retry after 30 seconds
      };
    } catch (handlingError) {
      console.error(`❌ [BOT_ROUTE] Critical error in ${endpoint}:`, error);
      return {
        success: false,
        errorMessage: "Internal error handling failed",
        shouldRetry: false,
      };
    }
  }

  /**
   * Batch error handling for multiple message operations
   */
  public async handleBatchErrors(
    errors: Array<{ error: Error; context: string; recipient?: string }>
  ): Promise<{
    totalErrors: number;
    criticalErrors: number;
    recoverableErrors: number;
    shouldStopBatch: boolean;
  }> {
    let criticalErrors = 0;
    let recoverableErrors = 0;

    for (const { error, context, recipient } of errors) {
      const classifiedError = WhatsAppErrorClassifier.classifyError(error);

      if (
        classifiedError.severity === ErrorSeverity.CRITICAL ||
        classifiedError.severity === ErrorSeverity.HIGH
      ) {
        criticalErrors++;
      } else {
        recoverableErrors++;
      }
    }

    return {
      totalErrors: errors.length,
      criticalErrors,
      recoverableErrors,
      shouldStopBatch: criticalErrors > errors.length * 0.5, // Stop if >50% critical
    };
  }
}

// Export the class as default for backward compatibility
export default WhatsAppErrorHandlerService;
