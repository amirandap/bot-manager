/**
 * Unified WhatsApp Error Handler Utility
 * 
 * This is the central error handling system for the WhatsApp bot.
 * It consolidates error validation, categorization, messaging, and logging.
 * 
 * Features:
 * - WhatsApp error validation and categorization
 * - Error message sending to fallback numbers
 * - Detailed error analysis with troubleshooting
 * - Generic message error handling
 * - Critical error processing
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from 'whatsapp-web.js';
import { 
  cleanAndFormatPhoneNumber,
} from '../helpers/cleanAndFormatPhoneNumber';
import { getFallbackNumber } from './fallbackUtils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ============================================================================
// ERROR PATTERNS CONFIGURATION
// ============================================================================

/**
 * Common WhatsApp Web.js errors that occur AFTER successful message delivery
 * These errors should not trigger fallback messages as the original message
 * was sent successfully
 */
const POST_SEND_ERROR_PATTERNS = [
  // Session corruption errors (most common)
  {
    pattern: /Cannot read properties of undefined \(reading 'serialize'\)/,
    type: 'SESSION_CORRUPTED',
    description: 'WhatsApp session serialization error (post-send)',
  },
  {
    pattern: /Cannot read properties of null \(reading 'serialize'\)/,
    type: 'SESSION_CORRUPTED',
    description: 'WhatsApp session null serialization error (post-send)',
  },
  
  // Network/connection errors that happen after send
  {
    pattern: /Evaluation failed: ReferenceError: window\.WWebJS is not defined/,
    type: 'SESSION_DISCONNECTED',
    description: 'WhatsApp Web context lost (post-send)',
  },
  {
    pattern: /Protocol error \(Runtime\.callFunctionOn\): Session closed/,
    type: 'SESSION_CLOSED',
    description: 'Browser session closed during response processing',
  },
  {
    pattern: /Target closed/,
    type: 'TARGET_CLOSED',
    description: 'Browser target closed during response processing',
  },
  
  // Puppeteer evaluation errors
  {
    pattern: /Evaluation failed: TypeError: Cannot read properties/,
    type: 'EVALUATION_ERROR',
    description: 'Browser evaluation error during response processing',
  },
  {
    pattern: /pptr:\/\/_puppeteer_evaluation_script_/,
    type: 'PUPPETEER_ERROR',
    description: 'Puppeteer script execution error (post-send)',
  },
  
  // WhatsApp Web specific errors
  {
    pattern: /getMessageModel.*serialize/,
    type: 'MESSAGE_MODEL_ERROR',
    description: 'WhatsApp message model serialization error',
  },
  {
    pattern: /Chat not found/,
    type: 'CHAT_REFERENCE_ERROR',
    description: 'Chat reference lost during response processing',
  },
];

/**
 * Critical errors that should always trigger fallback messages
 * These indicate actual sending failures
 */
const CRITICAL_ERROR_PATTERNS = [
  {
    pattern: /Phone number is not registered/,
    type: 'INVALID_RECIPIENT',
    description: 'Phone number not registered on WhatsApp',
  },
  {
    pattern: /Group not found/,
    type: 'INVALID_GROUP',
    description: 'WhatsApp group not found or bot not a member',
  },
  {
    pattern: /Not logged in/,
    type: 'NOT_AUTHENTICATED',
    description: 'WhatsApp session not authenticated',
  },
  {
    pattern: /Rate limit exceeded/,
    type: 'RATE_LIMITED',
    description: 'WhatsApp API rate limit exceeded',
  },
  {
    pattern: /Client not ready/,
    type: 'CLIENT_NOT_READY',
    description: 'WhatsApp client not initialized',
  },
];

// ============================================================================
// ERROR MESSAGING FUNCTIONS
// ============================================================================

/**
 * Send error message to fallback number
 * Consolidated from errorMessaging.ts
 * @param client WhatsApp client
 * @param message Error message to send
 * @param fallbackNumber Optional fallback number (uses default if not provided)
 * @returns Promise<void>
 */
export async function sendErrorMessage(
  client: Client | null,
  message: string,
  fallbackNumber?: string,
): Promise<void> {
  if (!client) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ [ERROR_SENDER] Client not initialized, cannot send error message',
    );
    return;
  }

  const targetNumber = fallbackNumber || getFallbackNumber();
  const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(targetNumber);
  const whatsappNumber = cleanedPhoneNumber.startsWith('+')
    ? cleanedPhoneNumber.slice(1)
    : cleanedPhoneNumber;
  const formattedNumber = `${whatsappNumber.trim()}@c.us`;

  // eslint-disable-next-line no-console
  console.log(
    `📱 [ERROR_SENDER] Sending error message to fallback: ${formattedNumber}`,
  );

  try {
    await client.sendMessage(formattedNumber, message);
    // eslint-disable-next-line no-console
    console.log(
      '✅ [ERROR_SENDER] Error message sent successfully to fallback',
    );
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ [ERROR_SENDER] Failed to send error message to fallback:',
      error,
    );
    // Don't throw here to avoid infinite error loops
  }
}

// ============================================================================
// ERROR VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a WhatsApp error to determine if it should be ignored or handled
 * 
 * @param error - The error object or string to validate
 * @returns ErrorValidationResult with validation details
 */
export function validateWhatsAppError(error: any): ErrorValidationResult {
  const errorMessage = typeof error === 'string' ? error : 
    error?.message || 
    error?.toString() || 
    'Unknown error';

  // Check for critical errors first (these should never be ignored)
  for (const criticalError of CRITICAL_ERROR_PATTERNS) {
    if (criticalError.pattern.test(errorMessage)) {
      return {
        shouldIgnore: false,
        errorType: criticalError.type,
        isPostSendError: false,
        description: criticalError.description,
      };
    }
  }

  // Check for post-send errors (these should be ignored)
  for (const postSendError of POST_SEND_ERROR_PATTERNS) {
    if (postSendError.pattern.test(errorMessage)) {
      return {
        shouldIgnore: true,
        errorType: postSendError.type,
        isPostSendError: true,
        description: postSendError.description,
      };
    }
  }

  // Unknown error - default to not ignoring (safer approach)
  return {
    shouldIgnore: false,
    errorType: 'UNKNOWN_ERROR',
    isPostSendError: false,
    description: 'Unknown error type - requires investigation',
  };
}

/**
 * Logs error information with appropriate level based on validation result
 * 
 * @param error - The error to log
 * @param context - Additional context (e.g., 'GROUP_MESSAGE', 'PHONE_MESSAGE')
 * @param recipient - The recipient identifier (group ID or phone number)
 */
export function logWhatsAppError(
  error: any, 
  context: string, 
  recipient?: string,
): ErrorValidationResult {
  const validation = validateWhatsAppError(error);
  const errorMessage = typeof error === 'string' ? error : 
    error?.message || error?.toString() || 'Unknown error';
  
  if (validation.shouldIgnore) {
    // Post-send errors - log as info/warning since message was delivered
    // eslint-disable-next-line no-console
    console.log(`⚠️ [${context}] Ignoring post-send error for ${recipient}:`);
    // eslint-disable-next-line no-console
    console.log(`   Type: ${validation.errorType}`);
    // eslint-disable-next-line no-console
    console.log(`   Description: ${validation.description}`);
    // eslint-disable-next-line no-console
    console.log(`   Original Error: ${errorMessage}`);
    // eslint-disable-next-line no-console
    console.log(
      '   ✅ Message was delivered successfully - this is a post-delivery error',
    );
  } else {
    // Critical errors - log as error since delivery likely failed
    // eslint-disable-next-line no-console
    console.error(`❌ [${context}] Critical error for ${recipient}:`);
    // eslint-disable-next-line no-console
    console.error(`   Type: ${validation.errorType}`);
    // eslint-disable-next-line no-console
    console.error(`   Description: ${validation.description}`);
    // eslint-disable-next-line no-console
    console.error(`   Original Error: ${errorMessage}`);
    // eslint-disable-next-line no-console
    console.error('   🚨 This error indicates actual delivery failure');
  }
  
  return validation;
}

/**
 * Determines if a fallback message should be sent based on error validation
 * 
 * @param error - The error to evaluate
 * @param context - Context for logging
 * @param recipient - Recipient identifier
 * @returns true if fallback should be sent, false if error should be ignored
 */
export function shouldSendFallback(
  error: any, 
  context: string, 
  recipient?: string,
): boolean {
  const validation = logWhatsAppError(error, context, recipient);
  return !validation.shouldIgnore;
}

// ============================================================================
// DETAILED ERROR ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Categorize and analyze errors with detailed troubleshooting information
 * Enhanced from legacy helpers.ts with detailed troubleshooting
 */
export function categorizeError(
  error: any, 
  recipient?: string, 
  originalRecipient?: string,
): DetailedErrorAnalysis {
  let errorType = 'UNKNOWN_ERROR';
  let errorMessage = error instanceof Error ? error.message : 'Unknown error';
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

  // Enhanced categorization based on error patterns
  if (errorMessage.includes('BOT_ERROR:')) {
    errorType = 'BOT_INITIALIZATION_ERROR';
    severity = 'CRITICAL';
  } else if (errorMessage.includes('WHATSAPP_ERROR:')) {
    errorType = 'WHATSAPP_NUMBER_ERROR';
    severity = 'HIGH';
  } else if (errorMessage.includes('WHATSAPP_VERIFICATION_ERROR:')) {
    errorType = 'WHATSAPP_VERIFICATION_ERROR';
    severity = 'HIGH';
  } else if (errorMessage.includes('serialize')) {
    errorType = 'WHATSAPP_SERIALIZATION_ERROR';
    errorMessage = 'WhatsApp post-send serialization error - ' +
      'message likely delivered but session unstable';
    severity = 'LOW'; // Message was likely delivered
  } else if (errorMessage.includes('Cannot read properties')) {
    errorType = 'WHATSAPP_DOM_ERROR';
    errorMessage = 'WhatsApp Web DOM structure changed or session lost';
    severity = 'MEDIUM';
  } else if (errorMessage.includes('Evaluation failed')) {
    errorType = 'WHATSAPP_SCRIPT_ERROR';
    errorMessage = 'WhatsApp Web script execution failed - ' +
      'session may be unstable';
    severity = 'MEDIUM';
  } else if (errorMessage.includes('Target closed')) {
    errorType = 'BROWSER_TARGET_CLOSED';
    errorMessage = 'Browser session closed unexpectedly';
    severity = 'HIGH';
  } else if (errorMessage.includes('Session closed')) {
    errorType = 'SESSION_CLOSED';
    errorMessage = 'WhatsApp Web session terminated';
    severity = 'HIGH';
  }

  // Get troubleshooting guidance
  const troubleshootingGuides: Record<string, string> = {
    BOT_INITIALIZATION_ERROR: 
      'Restart the bot service - client not initialized properly',
    WHATSAPP_NUMBER_ERROR: 'Verify the phone number is registered on WhatsApp',
    WHATSAPP_VERIFICATION_ERROR: 
      'Check number format and WhatsApp registration status',
    WHATSAPP_SERIALIZATION_ERROR: 
      'Post-send error - message likely delivered, monitor session stability',
    WHATSAPP_SESSION_ERROR: 'Scan QR code to re-authenticate WhatsApp Web',
    WHATSAPP_DOM_ERROR: 
      'Restart bot - WhatsApp Web may have updated its interface',
    WHATSAPP_SCRIPT_ERROR: 
      'Restart bot and scan QR code if connection issues persist',
    BROWSER_TARGET_CLOSED: 
      'Restart bot service - browser session terminated unexpectedly',
    SESSION_CLOSED: 'Restart bot and re-authenticate WhatsApp Web session',
    UNKNOWN_ERROR: 
      'Check bot logs for more details and restart bot if necessary',
  };

  return {
    errorType,
    errorMessage,
    originalError: error instanceof Error ? error.message : String(error),
    recipient,
    originalRecipient,
    timestamp: new Date().toISOString(),
    troubleshooting: troubleshootingGuides[errorType] || 
      troubleshootingGuides.UNKNOWN_ERROR,
    severity,
  };
}

// ============================================================================
// GENERIC MESSAGE ERROR HANDLING CLASS
// ============================================================================

/**
 * Generic error handler for message sending operations
 * Consolidated from messageErrorHandler.ts
 * Handles error processing and reporting for any message type
 */
export class MessageErrorHandler {
  public static async sendErrorReport(
    client: Client | null,
    requestBody: Record<string, unknown>,
    errors: Array<{
      recipient: string;
      error: string;
      errorType: string;
      timestamp: string;
    }>,
    endpoint: string = 'message-endpoint',
  ): Promise<void> {
    if (errors.length > 0) {
      const errorMessage = `
Error en ${endpoint}

Payload: ${JSON.stringify(requestBody)}
Errors: ${JSON.stringify(errors)}
`;
      await sendErrorMessage(client, errorMessage);
    }
  }

  public static async handleCriticalError(
    client: Client | null,
    error: unknown,
    requestBody: Record<string, unknown>,
    endpoint: string = 'message-endpoint',
  ): Promise<{
    errorType: string;
    errorMessage: string;
    errorDetails: DetailedErrorAnalysis;
  }> {
    // eslint-disable-next-line no-console
    console.error(`❌ [BOT_ROUTE] Critical error in ${endpoint}:`, error);
    
    // Use standardized error categorization
    const errorDetails = categorizeError(error, undefined, undefined);
    
    let reason = 'Unknown reason';
    if (error instanceof Error) {
      reason = error.message;
    }
    
    const enhancedErrorDetails: DetailedErrorAnalysis = {
      ...errorDetails,
      troubleshooting: errorDetails.troubleshooting + `
      
Additional troubleshooting for ${endpoint}:
- Check WhatsApp client connection status
- Verify phone number format
- Wait before retrying (rate limiting)
- Check network connectivity
- Monitor session stability`,
    };
    
    // Send critical error report
    const criticalErrorMessage = `
🚨 CRITICAL ERROR in ${endpoint}

Error Type: ${errorDetails.errorType}
Severity: ${errorDetails.severity}
Description: ${errorDetails.troubleshooting}

Error Details: ${reason}
Request Body: ${JSON.stringify(requestBody)}
Timestamp: ${errorDetails.timestamp}
`;
    
    await sendErrorMessage(client, criticalErrorMessage);
    
    return {
      errorType: errorDetails.errorType,
      errorMessage: criticalErrorMessage,
      errorDetails: enhancedErrorDetails,
    };
  }
}

// ============================================================================
// EXPORTS (for backward compatibility)
// ============================================================================

// Export the class as default for backward compatibility
export default MessageErrorHandler;
