import { Client } from 'whatsapp-web.js';
import { sendErrorMessage } from './errorMessaging';
import { categorizeError, DetailedErrorAnalysis } from './errorHandler';

/**
 * Generic error handler for message sending operations
 * Handles error processing and reporting for any message type
 */
export default class MessageErrorHandler {
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
