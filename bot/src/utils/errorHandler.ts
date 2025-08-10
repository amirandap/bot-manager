/**
 * Unified WhatsApp Error Handler
 *
 * Industry-standard error handling system following the Error-First pattern
 * with WhatsApp-specific error classification and recovery strategies.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "whatsapp-web.js";
import { getFallbackNumber } from "./fallbackUtils";
import { formatPhoneForWhatsApp } from "./recipientFormatting";
import {
  ErrorSeverity,
  ErrorCategory,
  WhatsAppError,
  ErrorHandlerOptions,
  ErrorValidationResult,
  DetailedErrorAnalysis,
} from "../types/types";

// ============================================================================
// ERROR CLASSIFICATION SYSTEM
// ============================================================================

/**
 * WhatsApp Error Classifier - Industry standard error classification
 * Maintains all your existing error patterns but organizes them efficiently
 */
class WhatsAppErrorClassifier {
  private static readonly ERROR_PATTERNS = {
    // Post-send errors (message delivered but session issues after)
    POST_SEND: [
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
        description: "WhatsApp Web context lost (post-send)",
      },
      {
        pattern: /Protocol error \(Runtime\.callFunctionOn\): Session closed/,
        category: ErrorCategory.SESSION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        isRecoverable: true,
        description: "Browser session closed during response processing",
      },
      {
        pattern: /Target closed/,
        category: ErrorCategory.BROWSER_ERROR,
        severity: ErrorSeverity.HIGH,
        isRecoverable: false,
        description: "Browser target closed during response processing",
      },
      {
        pattern: /Evaluation failed: TypeError: Cannot read properties/,
        category: ErrorCategory.BROWSER_ERROR,
        severity: ErrorSeverity.MEDIUM,
        isRecoverable: true,
        description: "Browser evaluation error during response processing",
      },
      {
        pattern: /pptr:\/\/_puppeteer_evaluation_script_/,
        category: ErrorCategory.BROWSER_ERROR,
        severity: ErrorSeverity.MEDIUM,
        isRecoverable: true,
        description: "Puppeteer script execution error (post-send)",
      },
      {
        pattern: /getMessageModel.*serialize/,
        category: ErrorCategory.SERIALIZATION_ERROR,
        severity: ErrorSeverity.LOW,
        isRecoverable: true,
        description: "WhatsApp message model serialization error",
      },
      {
        pattern: /Chat not found/,
        category: ErrorCategory.SESSION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        isRecoverable: true,
        description: "Chat reference lost during response processing",
      },
    ],

    // Critical errors (actual delivery failures)
    CRITICAL: [
      {
        pattern: /Phone number is not registered/,
        category: ErrorCategory.RECIPIENT_ERROR,
        severity: ErrorSeverity.HIGH,
        isRecoverable: false,
        description: "Phone number not registered on WhatsApp",
      },
      {
        pattern: /Group not found/,
        category: ErrorCategory.RECIPIENT_ERROR,
        severity: ErrorSeverity.HIGH,
        isRecoverable: false,
        description: "WhatsApp group not found or bot not a member",
      },
      {
        pattern: /Not logged in/,
        category: ErrorCategory.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.CRITICAL,
        isRecoverable: true,
        description: "WhatsApp session not authenticated",
      },
      {
        pattern: /Rate limit exceeded/,
        category: ErrorCategory.RATE_LIMIT_ERROR,
        severity: ErrorSeverity.HIGH,
        isRecoverable: true,
        description: "WhatsApp API rate limit exceeded",
      },
      {
        pattern: /Client not ready/,
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.CRITICAL,
        isRecoverable: true,
        description: "WhatsApp client not initialized",
      },
    ],
  };

  /**
   * Classifies an error based on patterns and returns WhatsAppError
   */
  public static classify(
    error: any,
    context?: string,
    recipient?: string
  ): WhatsAppError {
    const errorMessage =
      typeof error === "string"
        ? error
        : error?.message || error?.toString() || "Unknown error";

    // Check critical errors first
    for (const pattern of this.ERROR_PATTERNS.CRITICAL) {
      if (pattern.pattern.test(errorMessage)) {
        return this.createWhatsAppError(
          error,
          pattern,
          false,
          context,
          recipient
        );
      }
    }

    // Check post-send errors
    for (const pattern of this.ERROR_PATTERNS.POST_SEND) {
      if (pattern.pattern.test(errorMessage)) {
        return this.createWhatsAppError(
          error,
          pattern,
          true,
          context,
          recipient
        );
      }
    }

    // Unknown error - default to critical for safety
    return this.createWhatsAppError(
      error,
      {
        category: ErrorCategory.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        isRecoverable: false,
        description: "Unknown error type - requires investigation",
      },
      false,
      context,
      recipient
    );
  }

  private static createWhatsAppError(
    originalError: any,
    pattern: any,
    isPostSend: boolean,
    context?: string,
    recipient?: string
  ): WhatsAppError {
    const message =
      typeof originalError === "string"
        ? originalError
        : originalError?.message || "Unknown error";

    const whatsappError = new Error(message) as WhatsAppError;
    whatsappError.name = "WhatsAppError";
    whatsappError.category = pattern.category;
    whatsappError.severity = pattern.severity;
    whatsappError.isRecoverable = pattern.isRecoverable;
    whatsappError.isPostSend = isPostSend;
    whatsappError.context = context;
    whatsappError.recipient = recipient;
    whatsappError.metadata = {
      originalError: originalError,
      description: pattern.description,
      timestamp: new Date().toISOString(),
    };

    return whatsappError;
  }
}

// ============================================================================
// MAIN ERROR HANDLER (Industry Standard)
// ============================================================================

/**
 * WhatsApp Error Handler - Centralized error processing
 * Follows industry standards for error handling with circuit breaker pattern
 */
export class WhatsAppErrorHandler {
  private static instance: WhatsAppErrorHandler;
  private readonly fallbackEnabled: boolean = true;
  private readonly loggingEnabled: boolean = true;

  private constructor() {}

  public static getInstance(): WhatsAppErrorHandler {
    if (!this.instance) {
      this.instance = new WhatsAppErrorHandler();
    }
    return this.instance;
  }

  /**
   * Main error processing method - handles all WhatsApp errors
   */
  public async handle(
    error: any,
    client: Client | null = null,
    options: ErrorHandlerOptions = {}
  ): Promise<WhatsAppError> {
    const whatsappError = WhatsAppErrorClassifier.classify(
      error,
      options.context,
      options.context
    );

    // Log error based on severity
    this.logError(whatsappError);

    // Send fallback notification if needed
    if (
      this.shouldSendFallback(whatsappError) &&
      options.enableFallback !== false
    ) {
      await this.sendFallbackNotification(client, whatsappError);
    }

    return whatsappError;
  }

  /**
   * Determines if fallback should be sent (legacy compatibility)
   */
  private shouldSendFallback(error: WhatsAppError): boolean {
    return !error.isPostSend && error.severity !== ErrorSeverity.LOW;
  }

  /**
   * Enhanced logging based on error severity
   */
  private logError(error: WhatsAppError): void {
    if (!this.loggingEnabled) return;

    const logData = {
      category: error.category,
      severity: error.severity,
      message: error.message,
      isPostSend: error.isPostSend,
      context: error.context,
      recipient: error.recipient,
      timestamp: error.metadata?.timestamp,
    };

    if (error.isPostSend) {
      // eslint-disable-next-line no-console
      console.log(
        `⚠️ [POST_SEND_ERROR] ${error.context || "Unknown"}:`,
        logData
      );
      // eslint-disable-next-line no-console
      console.log("   ✅ Message likely delivered - post-send error");
    } else if (error.severity === ErrorSeverity.CRITICAL) {
      // eslint-disable-next-line no-console
      console.error(
        `🚨 [CRITICAL_ERROR] ${error.context || "Unknown"}:`,
        logData
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ [ERROR] ${error.context || "Unknown"}:`, logData);
    }
  }

  /**
   * Send fallback notification
   */
  private async sendFallbackNotification(
    client: Client | null,
    error: WhatsAppError
  ): Promise<void> {
    if (!client || !this.fallbackEnabled) return;

    const message = this.formatErrorMessage(error);
    await this.sendErrorMessage(client, message);
  }

  /**
   * Format error message for fallback notification
   */
  private formatErrorMessage(error: WhatsAppError): string {
    const severity =
      error.severity === ErrorSeverity.CRITICAL ? "🚨 CRITICAL" : "⚠️ ERROR";
    return `${severity} WhatsApp Error

Category: ${error.category}
Context: ${error.context || "Unknown"}
Recipient: ${error.recipient || "Unknown"}
Message: ${error.message}

Description: ${error.metadata?.description || "No description"}
Time: ${error.metadata?.timestamp}
Recoverable: ${error.isRecoverable ? "Yes" : "No"}`;
  }

  /**
   * Send error message to fallback number (optimized version)
   */
  private async sendErrorMessage(
    client: Client,
    message: string
  ): Promise<void> {
    try {
      const fallbackNumber = getFallbackNumber();
      const whatsappNumber = formatPhoneForWhatsApp(fallbackNumber);
      const formattedNumber = `${whatsappNumber}@c.us`;

      await client.sendMessage(formattedNumber, message);
      // eslint-disable-next-line no-console
      console.log("✅ [ERROR_HANDLER] Fallback notification sent");
    } catch (fallbackError: any) {
      // eslint-disable-next-line no-console
      console.error(
        "❌ [ERROR_HANDLER] Failed to send fallback:",
        fallbackError.message
      );
    }
  }
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * Legacy compatibility functions that maintain existing interfaces
 * but use the new centralized error handler internally
 */

/**
 * Send error message to fallback number (legacy interface)
 */
async function sendErrorMessageLegacy(
  client: Client | null,
  message: string,
  fallbackNumber?: string
): Promise<void> {
  if (!client) {
    // eslint-disable-next-line no-console
    console.error(
      "❌ [ERROR_SENDER] Client not initialized, cannot send error message"
    );
    return;
  }

  const targetNumber = fallbackNumber || getFallbackNumber();
  const whatsappNumber = formatPhoneForWhatsApp(targetNumber);
  const formattedNumber = `${whatsappNumber}@c.us`;

  try {
    await client.sendMessage(formattedNumber, message);
    // eslint-disable-next-line no-console
    console.log(
      "✅ [ERROR_SENDER] Error message sent successfully to fallback"
    );
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      "❌ [ERROR_SENDER] Failed to send error message to fallback:",
      error
    );
  }
}

// Export with original name for backward compatibility
export const sendErrorMessage = sendErrorMessageLegacy;

/**
 * Validates WhatsApp error (legacy interface)
 */
export function validateWhatsAppError(error: any): ErrorValidationResult {
  const whatsappError = WhatsAppErrorClassifier.classify(error);

  return {
    shouldIgnore: whatsappError.isPostSend,
    errorType: whatsappError.category,
    isPostSendError: whatsappError.isPostSend,
    description:
      whatsappError.metadata?.description &&
      typeof whatsappError.metadata.description === "string"
        ? whatsappError.metadata.description
        : "No description",
  };
}

/**
 * Logs WhatsApp error (legacy interface)
 */
export function logWhatsAppError(
  error: any,
  context: string,
  recipient?: string
): ErrorValidationResult {
  const handler = WhatsAppErrorHandler.getInstance();
  const whatsappError = WhatsAppErrorClassifier.classify(
    error,
    context,
    recipient
  );

  // Use the new handler's logging
  handler["logError"](whatsappError);

  return {
    shouldIgnore: whatsappError.isPostSend,
    errorType: whatsappError.category,
    isPostSendError: whatsappError.isPostSend,
    description:
      whatsappError.metadata?.description &&
      typeof whatsappError.metadata.description === "string"
        ? whatsappError.metadata.description
        : "No description",
  };
}

/**
 * Determines if fallback should be sent (legacy interface)
 */
export function shouldSendFallback(
  error: any,
  context: string,
  recipient?: string
): boolean {
  const whatsappError = WhatsAppErrorClassifier.classify(
    error,
    context,
    recipient
  );
  logWhatsAppError(error, context, recipient);
  return (
    !whatsappError.isPostSend && whatsappError.severity !== ErrorSeverity.LOW
  );
}

/**
 * Categorize error with detailed analysis (legacy interface)
 */
export function categorizeError(
  error: any,
  recipient?: string,
  originalRecipient?: string
): DetailedErrorAnalysis {
  const whatsappError = WhatsAppErrorClassifier.classify(
    error,
    "LEGACY",
    recipient
  );

  // Map to legacy format
  const troubleshootingGuides: Record<string, string> = {
    [ErrorCategory.AUTHENTICATION_ERROR]:
      "Scan QR code to re-authenticate WhatsApp Web",
    [ErrorCategory.SESSION_ERROR]:
      "Restart bot and scan QR code if connection issues persist",
    [ErrorCategory.BROWSER_ERROR]:
      "Restart bot service - browser session terminated unexpectedly",
    [ErrorCategory.SERIALIZATION_ERROR]:
      "Post-send error - message likely delivered, monitor session stability",
    [ErrorCategory.RECIPIENT_ERROR]:
      "Verify the phone number is registered on WhatsApp",
    [ErrorCategory.RATE_LIMIT_ERROR]:
      "Wait before retrying - rate limiting in effect",
    [ErrorCategory.SYSTEM_ERROR]:
      "Restart the bot service - client not initialized properly",
    [ErrorCategory.NETWORK_ERROR]: "Check network connectivity and retry",
    [ErrorCategory.VALIDATION_ERROR]: "Check input data format and retry",
    [ErrorCategory.UNKNOWN_ERROR]:
      "Check bot logs for more details and restart bot if necessary",
  };

  return {
    errorType: whatsappError.category,
    errorMessage: whatsappError.message,
    originalError:
      whatsappError.metadata?.originalError?.toString() ||
      whatsappError.message,
    recipient,
    originalRecipient,
    timestamp:
      whatsappError.metadata?.timestamp &&
      typeof whatsappError.metadata.timestamp === "string"
        ? whatsappError.metadata.timestamp
        : new Date().toISOString(),
    troubleshooting:
      troubleshootingGuides[whatsappError.category] ||
      troubleshootingGuides[ErrorCategory.UNKNOWN_ERROR],
    severity: whatsappError.severity,
  };
}

// ============================================================================
// MESSAGE ERROR HANDLER CLASS (Updated to use new system)
// ============================================================================

/**
 * Message Error Handler - Specialized for route error handling
 * Updated to use the new centralized error system
 */
export class MessageErrorHandler {
  private static errorHandler = WhatsAppErrorHandler.getInstance();

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
    if (errors.length > 0) {
      const errorMessage = `Error in ${endpoint}

Payload: ${JSON.stringify(requestBody)}
Errors: ${JSON.stringify(errors)}`;

      if (client) {
        await this.errorHandler["sendErrorMessage"](client, errorMessage);
      }
    }
  }

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
    // eslint-disable-next-line no-console
    console.error(`❌ [BOT_ROUTE] Critical error in ${endpoint}:`, error);

    // Use the new error handler
    const whatsappError = await this.errorHandler.handle(error, client, {
      context: endpoint,
      enableFallback: true,
    });

    // Convert to legacy format for backward compatibility
    const errorDetails = categorizeError(error, undefined, undefined);

    const criticalErrorMessage = `🚨 CRITICAL ERROR in ${endpoint}

Error Type: ${whatsappError.category}
Severity: ${whatsappError.severity}
Description: ${whatsappError.metadata?.description || "No description"}

Error Details: ${whatsappError.message}
Request Body: ${JSON.stringify(requestBody)}
Timestamp: ${whatsappError.metadata?.timestamp}`;

    return {
      errorType: whatsappError.category,
      errorMessage: criticalErrorMessage,
      errorDetails,
    };
  }
}

// ============================================================================
// EXPORTS AND BACKWARD COMPATIBILITY
// ============================================================================

// Export the class as default for backward compatibility
export default MessageErrorHandler;
