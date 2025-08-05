import { Client } from "whatsapp-web.js";
import { sendErrorMessage } from "../helpers/helpers";
import { logWhatsAppError } from "./errorHandler";

/**
 * Generic error handler for message sending operations
 * Handles error processing and reporting for any message type
 */
export default class MessageErrorHandler {
  static async sendErrorReport(
    client: Client | null,
    requestBody: any,
    errors: any[],
    endpoint: string = "message-endpoint"
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

  static async handleCriticalError(
    client: Client | null,
    error: unknown,
    requestBody: any,
    endpoint: string = "message-endpoint"
  ): Promise<{ errorType: string; errorMessage: string; errorDetails: any }> {
    console.error(`❌ [BOT_ROUTE] Critical error in ${endpoint}:`, error);
    
    // Use standardized error validation
    const validation = logWhatsAppError(error, 'CRITICAL_ERROR', endpoint);
    
    let reason = "Unknown reason";
    if (error instanceof Error) {
      reason = error.message;
    }
    
    const errorDetails = {
      endpoint,
      errorType: validation.errorType,
      error: reason,
      payload: requestBody,
      timestamp: new Date().toISOString(),
      isPostSendError: validation.isPostSendError,
      shouldIgnore: validation.shouldIgnore,
      description: validation.description,
      troubleshooting: {
        commonCauses: [
          "WhatsApp client disconnected",
          "Invalid phone number format",
          "Rate limiting",
          "Network connectivity issues"
        ],
        suggestedActions: [
          "Check client connection status",
          "Verify phone number format",
          "Wait before retrying",
          "Check network connectivity"
        ]
      }
    };
    
    // Send critical error report
    const criticalErrorMessage = `
🚨 CRITICAL ERROR in ${endpoint}

Error Type: ${validation.errorType}
Description: ${validation.description}
Should Ignore: ${validation.shouldIgnore}
Is Post-Send Error: ${validation.isPostSendError}

Error Details: ${reason}
Request Body: ${JSON.stringify(requestBody)}
Timestamp: ${new Date().toISOString()}
`;
    
    await sendErrorMessage(client, criticalErrorMessage);
    
    return {
      errorType: validation.errorType,
      errorMessage: criticalErrorMessage,
      errorDetails
    };
  }
}
