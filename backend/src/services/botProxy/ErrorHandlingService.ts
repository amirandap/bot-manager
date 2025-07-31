import { Response } from "express";

export interface ErrorResponse {
  success: false;
  error: string;
  errorType: string;
  details: string;
  requestId: number;
  timestamp: string;
  troubleshooting: string;
}

export class ErrorHandlingService {
  
  /**
   * Handle and respond to errors from bot communication
   */
  public handleError(error: unknown, requestId: number, res: Response): void {
    console.error(`❌ [BACKEND] Request ${requestId} failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isBackendError = errorMessage.startsWith('BACKEND_ERROR:');
    const isBotError = errorMessage.startsWith('BOT_ERROR:');
    const isConnectionError = errorMessage.startsWith('CONNECTION_ERROR:');
    const isRequestSetupError = errorMessage.startsWith('REQUEST_SETUP_ERROR:');
    
    let statusCode = 500;
    let errorType = "UNKNOWN_ERROR";
    
    if (isBackendError) {
      statusCode = 404;
      errorType = "BACKEND_ERROR";
    } else if (isBotError) {
      statusCode = 502;
      errorType = "BOT_ERROR";
    } else if (isConnectionError) {
      statusCode = 503;
      errorType = "CONNECTION_ERROR";
    } else if (isRequestSetupError) {
      statusCode = 400;
      errorType = "REQUEST_SETUP_ERROR";
    }
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: "Failed to send message",
      errorType,
      details: errorMessage,
      requestId,
      timestamp: new Date().toISOString(),
      troubleshooting: this.getTroubleshootingMessage(errorType)
    };
    
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Get troubleshooting message for different error types
   */
  private getTroubleshootingMessage(errorType: string): string {
    const troubleshootingMap: { [key: string]: string } = {
      BACKEND_ERROR: "Check bot configuration in config/bots.json",
      BOT_ERROR: "Check bot logs and WhatsApp session status",
      CONNECTION_ERROR: "Verify bot is running and accessible",
      REQUEST_SETUP_ERROR: "Check request format and parameters",
      UNKNOWN_ERROR: "Check system logs for more details"
    };
    
    return troubleshootingMap[errorType] || "Check system logs for more details";
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(message: string, requestId: number, res: Response): void {
    console.error(`❌ [BACKEND] Request ${requestId}: ${message}`);
    res.status(400).json({ 
      error: `VALIDATION_ERROR: ${message}`,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle generic controller errors
   */
  public handleControllerError(operation: string, error: unknown, res: Response): void {
    console.error(`Error ${operation}:`, error);
    res.status(500).json({
      error: `Failed to ${operation}`,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
