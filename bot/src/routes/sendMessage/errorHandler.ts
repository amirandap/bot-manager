import { Client } from "whatsapp-web.js";
import { sendErrorMessage } from "../../helpers/helpers";
import { SendMessageRequestBody } from "./types";
import { logWhatsAppError } from "../../utils/errorHandler";

/**
 * Handles error processing and reporting
 */
export default class ErrorHandler {
  static async sendErrorReport(
    client: Client | null,
    requestBody: SendMessageRequestBody,
    errors: any[]
  ): Promise<void> {
    if (errors.length > 0) {
      const errorMessage = `
Error en /send-message

Payload: ${JSON.stringify(requestBody)}
Errors: ${JSON.stringify(errors)}
`;
      await sendErrorMessage(client, errorMessage);
    }
  }

  static async handleCriticalError(
    client: Client | null,
    error: unknown,
    requestBody: SendMessageRequestBody
  ): Promise<{ errorType: string; errorMessage: string; errorDetails: any }> {
    console.error("❌ [BOT_ROUTE] Critical error in /send-message endpoint:", error);
    
    // Use standardized error validation
    const validation = logWhatsAppError(error, 'CRITICAL_ERROR', 'send-message endpoint');
    
    let reason = "Unknown reason";
    if (error instanceof Error) {
      reason = error.message;
    }
    
    const errorDetails = {
      endpoint: "/send-message",
      errorType: validation.errorType,
      error: reason,
      payload: requestBody,
      timestamp: new Date().toISOString(),
      isPostSendError: validation.isPostSendError,
      shouldIgnore: validation.shouldIgnore,
      description: validation.description,
      troubleshooting: {
        CLIENT_NOT_INITIALIZED: "Restart bot service",
        SESSION_CORRUPTED: "Scan QR code to re-authenticate", 
        SESSION_DISCONNECTED: "Re-scan QR code",
        SESSION_CLOSED: "Restart bot and re-authenticate",
        WHATSAPP_SESSION_LOST: "Re-scan QR code",
        EVALUATION_ERROR: "Browser context lost - restart bot",
        PUPPETEER_ERROR: "Browser automation error - restart bot",
        NOT_AUTHENTICATED: "Scan QR code to authenticate",
        INVALID_RECIPIENT: "Check recipient format",
        INVALID_GROUP: "Verify group exists and bot is member",
        RATE_LIMITED: "Wait and retry - reduce sending frequency",
        CLIENT_NOT_READY: "Wait for client initialization",
        CRITICAL_ERROR: "Check bot logs and restart if necessary",
        UNKNOWN_ERROR: "Check logs for more details"
      }[validation.errorType] || "Check bot logs and restart if necessary"
    };
    
    console.error(`🔥 [BOT_ROUTE] Critical error details:`, errorDetails);
    
    const errorMessage: string = `
🚨 Critical Error in /send-message

Error Type: ${validation.errorType}
Payload: ${JSON.stringify(requestBody, null, 2)}
Error: ${reason}
Timestamp: ${new Date().toISOString()}
Troubleshooting: ${errorDetails.troubleshooting}
`;

    try {
      await sendErrorMessage(client, errorMessage);
    } catch (fallbackError) {
      console.error("❌ [BOT_ROUTE] Failed to send error message to fallback:", fallbackError);
    }
    
    return { errorType: validation.errorType, errorMessage, errorDetails };
  }
}
