import { Client } from "whatsapp-web.js";
import { sendErrorMessage } from "../../helpers/helpers";
import { SendMessageRequestBody } from "./types";

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
    
    let reason = "Unknown reason";
    let errorType = "CRITICAL_ERROR";
    
    if (error instanceof Error) {
      reason = error.message;
      
      // Categorize critical errors
      if (reason.includes("Client not initialized")) {
        errorType = "CLIENT_NOT_INITIALIZED";
      } else if (reason.includes("Cannot read properties")) {
        errorType = "SESSION_CORRUPTED";
      } else if (reason.includes("Evaluation failed")) {
        errorType = "WHATSAPP_SESSION_LOST";
      }
    }
    
    const errorDetails = {
      endpoint: "/send-message",
      errorType,
      error: reason,
      payload: requestBody,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        CLIENT_NOT_INITIALIZED: "Restart bot service",
        SESSION_CORRUPTED: "Scan QR code to re-authenticate",
        WHATSAPP_SESSION_LOST: "Re-scan QR code",
        CRITICAL_ERROR: "Check bot logs and restart if necessary"
      }[errorType]
    };
    
    console.error(`🔥 [BOT_ROUTE] Critical error details:`, errorDetails);
    
    const errorMessage: string = `
🚨 Critical Error in /send-message

Error Type: ${errorType}
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
    
    return { errorType, errorMessage, errorDetails };
  }
}
