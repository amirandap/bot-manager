/**
 * Error Handling Utilities
 * Pure functions for error validation and analysis
 * All functions are stateless and side-effect free
 */

import {
  ErrorSeverity,
  ErrorCategory,
  WhatsAppError,
  ErrorValidationResult,
} from "../types";

// ============================================================================
// PURE ERROR VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate if an error should be ignored (post-send errors)
 */
export function validateErrorSeverity(error: Error): ErrorValidationResult {
  const isPostSendError = isPostSendErrorType(error);
  const errorType = categorizeErrorMessage(error.message);

  return {
    shouldIgnore: isPostSendError,
    errorType,
    isPostSendError,
    description: generateErrorDescription(error, errorType),
  };
}

/**
 * Check if error is a post-send error (message was delivered)
 */
export function isPostSendErrorType(error: Error): boolean {
  const postSendPatterns = [
    /Cannot read properties of undefined \(reading 'serialize'\)/,
    /Cannot read properties of null \(reading 'serialize'\)/,
    /Evaluation failed: ReferenceError: window\.WWebJS is not defined/,
    /ReferenceError: serialVersionUID is not defined/,
    /Error: Property 'serialize' does not exist/,
  ];

  return postSendPatterns.some((pattern) => pattern.test(error.message));
}

/**
 * Categorize error message into known types
 */
export function categorizeErrorMessage(message: string): string {
  if (/Client is not ready/.test(message)) {
    return ErrorCategory.AUTHENTICATION_ERROR;
  }
  if (/Invalid number|Invalid parameter/.test(message)) {
    return ErrorCategory.RECIPIENT_ERROR;
  }
  if (/Rate limit/.test(message)) {
    return ErrorCategory.RATE_LIMIT_ERROR;
  }
  if (/Session closed|Execution context|Page crashed/.test(message)) {
    return ErrorCategory.SESSION_ERROR;
  }
  if (/Network error|Timeout|ERR_INTERNET|ERR_NETWORK/.test(message)) {
    return ErrorCategory.NETWORK_ERROR;
  }
  if (/serialize/.test(message)) {
    return ErrorCategory.SERIALIZATION_ERROR;
  }
  if (/ECONNREFUSED|Memory error|Process killed/.test(message)) {
    return ErrorCategory.SYSTEM_ERROR;
  }
  if (/File size|Invalid media|Failed to send media/.test(message)) {
    return ErrorCategory.VALIDATION_ERROR;
  }
  return ErrorCategory.UNKNOWN_ERROR;
}

/**
 * Generate human-readable error description
 */
export function generateErrorDescription(
  error: Error,
  category: string
): string {
  switch (category) {
    case ErrorCategory.AUTHENTICATION_ERROR:
      return "WhatsApp client is not authenticated or ready";
    case ErrorCategory.RECIPIENT_ERROR:
      return "Invalid recipient phone number or group ID";
    case ErrorCategory.RATE_LIMIT_ERROR:
      return "WhatsApp rate limit exceeded - too many requests";
    case ErrorCategory.SESSION_ERROR:
      return "WhatsApp session has been terminated or corrupted";
    case ErrorCategory.NETWORK_ERROR:
      return "Network connectivity issue preventing message delivery";
    case ErrorCategory.SERIALIZATION_ERROR:
      return "WhatsApp session serialization error (message likely sent)";
    case ErrorCategory.SYSTEM_ERROR:
      return "Critical system error affecting bot operation";
    case ErrorCategory.VALIDATION_ERROR:
      return "Request validation failed - check parameters";
    case ErrorCategory.BROWSER_ERROR:
      return "Browser or page-related error";
    default:
      return `Unknown error: ${error.message}`;
  }
}

/**
 * Determine error severity based on message patterns
 */
export function getErrorSeverity(error: Error): ErrorSeverity {
  const message = error.message;

  // Critical errors
  if (
    /Session closed|Page crashed|Process killed|ECONNREFUSED|Memory error/.test(
      message
    )
  ) {
    return ErrorSeverity.CRITICAL;
  }

  // High severity errors
  if (
    /Client is not ready|Rate limit|ERR_INTERNET_DISCONNECTED/.test(message)
  ) {
    return ErrorSeverity.HIGH;
  }

  // Medium severity errors
  if (
    /Invalid number|Network error|Timeout|Failed to send|File size/.test(
      message
    )
  ) {
    return ErrorSeverity.MEDIUM;
  }

  // Low severity (usually post-send errors)
  if (/serialize|window\.WWebJS/.test(message)) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM; // Default
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  const message = error.message;

  // Non-recoverable errors
  const nonRecoverablePatterns = [
    /Session closed/,
    /Page crashed/,
    /Process killed/,
    /ECONNREFUSED/,
    /Memory error/,
    /Client is not ready/,
    /Invalid number/,
    /Invalid parameter/,
    /File size too large/,
    /Invalid media type/,
  ];

  return !nonRecoverablePatterns.some((pattern) => pattern.test(message));
}

/**
 * Extract troubleshooting information for error
 */
export function extractTroubleshootingInfo(error: Error): {
  commonCauses: string[];
  suggestedActions: string[];
} {
  const category = categorizeErrorMessage(error.message);

  switch (category) {
    case ErrorCategory.AUTHENTICATION_ERROR:
      return {
        commonCauses: [
          "WhatsApp client not initialized",
          "QR code not scanned",
          "Session expired",
        ],
        suggestedActions: [
          "Check bot status",
          "Restart bot if needed",
          "Scan QR code again",
        ],
      };

    case ErrorCategory.RECIPIENT_ERROR:
      return {
        commonCauses: [
          "Invalid phone number format",
          "Non-existent WhatsApp number",
          "Blocked recipient",
        ],
        suggestedActions: [
          "Validate phone number format",
          "Check recipient exists on WhatsApp",
          "Use international format (+country code)",
        ],
      };

    case ErrorCategory.RATE_LIMIT_ERROR:
      return {
        commonCauses: [
          "Too many messages sent quickly",
          "WhatsApp anti-spam protection",
          "Account temporarily limited",
        ],
        suggestedActions: [
          "Wait before sending more messages",
          "Reduce message frequency",
          "Implement rate limiting",
        ],
      };

    case ErrorCategory.NETWORK_ERROR:
      return {
        commonCauses: [
          "Internet connection issues",
          "Firewall blocking requests",
          "DNS resolution problems",
        ],
        suggestedActions: [
          "Check internet connection",
          "Verify firewall settings",
          "Test connectivity to WhatsApp servers",
        ],
      };

    default:
      return {
        commonCauses: ["Various system or configuration issues"],
        suggestedActions: ["Check logs for details", "Contact support"],
      };
  }
}

/**
 * Calculate retry delay based on error type
 */
export function calculateRetryDelay(error: Error, attempt: number): number {
  const category = categorizeErrorMessage(error.message);
  const baseDelay = getBaseRetryDelay(category);

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 1000; // Add up to 1 second jitter

  return Math.min(exponentialDelay + jitter, 300000); // Max 5 minutes
}

/**
 * Get base retry delay for error category
 */
function getBaseRetryDelay(category: string): number {
  switch (category) {
    case ErrorCategory.RATE_LIMIT_ERROR:
      return 60000; // 1 minute
    case ErrorCategory.NETWORK_ERROR:
      return 30000; // 30 seconds
    case ErrorCategory.SESSION_ERROR:
      return 120000; // 2 minutes
    default:
      return 15000; // 15 seconds
  }
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(
  error: Error,
  context?: string,
  metadata?: Record<string, unknown>
): string {
  const category = categorizeErrorMessage(error.message);
  const severity = getErrorSeverity(error);
  const isRecoverable = isRecoverableError(error);

  const parts = [
    context ? `[${context}]` : "",
    `${category}:`,
    `${severity}`,
    isRecoverable ? "(Recoverable)" : "(Non-recoverable)",
    error.message,
  ].filter(Boolean);

  return parts.join(" ");
}

/**
 * Create error summary for reporting
 */
export function createErrorSummary(
  errors: Error[]
): {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalCount: number;
  recoverableCount: number;
} {
  const summary = {
    total: errors.length,
    byCategory: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    criticalCount: 0,
    recoverableCount: 0,
  };

  errors.forEach((error) => {
    const category = categorizeErrorMessage(error.message);
    const severity = getErrorSeverity(error);
    const isRecoverable = isRecoverableError(error);

    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;

    if (severity === ErrorSeverity.CRITICAL) {
      summary.criticalCount++;
    }

    if (isRecoverable) {
      summary.recoverableCount++;
    }
  });

  return summary;
}
