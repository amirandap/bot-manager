import { Response } from "express";

export interface ErrorResponse {
  success: false;
  error: string;
  errorType: string;
  details: string;
  requestId?: number;
  timestamp: string;
  troubleshooting: string;
  suggestion?: string;
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
   * Handle JSON parsing errors with detailed information
   */
  public handleJSONParseError(error: unknown, res: Response): void {
    console.error('❌ [JSON_PARSE_ERROR]:', error);
    
    let details = "Invalid JSON format";
    let suggestion = "Ensure your payload is valid JSON";
    
    if (error instanceof Error) {
      const errorMsg = error.message;
      
      // Detect specific JSON parsing issues
      if (errorMsg.includes("Unexpected token")) {
        if (errorMsg.includes('"when a car"') || errorMsg.includes('when a car')) {
          details = "Text sent instead of JSON. Detected plain text starting with 'when a car...'";
          suggestion = "Send JSON payload with Content-Type: application/json. Example: {\"botId\": \"...\", \"to\": \"...\", \"message\": \"...\"}";
        } else {
          details = `Invalid JSON syntax: ${errorMsg}`;
          suggestion = "Check for missing quotes, commas, or brackets in your JSON";
        }
      } else if (errorMsg.includes("Expected property name")) {
        details = "Malformed JSON object structure";
        suggestion = "Ensure all properties have names and are properly quoted";
      } else {
        details = errorMsg;
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: "JSON Parsing Error",
      errorType: "JSON_PARSE_ERROR",
      details,
      timestamp: new Date().toISOString(),
      troubleshooting: "Verify your request payload is valid JSON format",
      suggestion
    };
    
    res.status(400).json(errorResponse);
  }

  /**
   * Handle Multer file upload errors
   */
  public handleMulterError(error: unknown, res: Response): void {
    console.error('❌ [MULTER_ERROR]:', error);
    
    let details = "File upload error";
    let suggestion = "Check your file upload parameters";
    
    if (error instanceof Error && error.name === 'MulterError') {
      const multerError = error as any;
      
      if (multerError.code === 'UNEXPECTED_FIELD') {
        details = `Unexpected field in file upload: ${multerError.field || 'unknown'}`;
        suggestion = "Use 'file' as the field name for file uploads. Correct usage: -F \"file=@image.png\"";
      } else if (multerError.code === 'LIMIT_FILE_SIZE') {
        details = "File too large";
        suggestion = "Reduce file size or compress the image/document";
      } else if (multerError.code === 'LIMIT_FILE_COUNT') {
        details = "Too many files uploaded";
        suggestion = "Upload only one file at a time";
      } else if (multerError.code === 'LIMIT_UNEXPECTED_FILE') {
        details = "Unexpected file field";
        suggestion = "Use the correct field name 'file' for uploads";
      } else {
        details = multerError.message || "Unknown multer error";
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: "File Upload Error",
      errorType: "MULTER_ERROR",
      details,
      timestamp: new Date().toISOString(),
      troubleshooting: "Check your multipart/form-data request format",
      suggestion
    };
    
    res.status(400).json(errorResponse);
  }

  /**
   * Handle content type mismatches
   */
  public handleContentTypeError(contentType: string | undefined, res: Response): void {
    console.error(`❌ [CONTENT_TYPE_ERROR]: Invalid content type: ${contentType}`);
    
    const suggestion = contentType?.includes('text/') 
      ? "Use Content-Type: application/json for JSON payloads"
      : "Use Content-Type: application/json for JSON or multipart/form-data for files";

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Content Type Error",
      errorType: "CONTENT_TYPE_ERROR",
      details: `Invalid or missing Content-Type header: ${contentType || 'none'}`,
      timestamp: new Date().toISOString(),
      troubleshooting: "Set the correct Content-Type header for your request",
      suggestion
    };
    
    res.status(400).json(errorResponse);
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
      JSON_PARSE_ERROR: "Ensure your request body is valid JSON",
      MULTER_ERROR: "Check your file upload format and field names",
      CONTENT_TYPE_ERROR: "Set the correct Content-Type header",
      UNKNOWN_ERROR: "Check system logs for more details"
    };
    
    return troubleshootingMap[errorType] || "Check system logs for more details";
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(message: string, requestId: number, res: Response): void {
    console.error(`❌ [BACKEND] Request ${requestId}: ${message}`);
    
    let suggestion = "Check the API documentation for correct payload format";
    
    // Provide specific suggestions for common validation errors
    if (message.includes("Bot ID")) {
      suggestion = "Include 'botId' field in your request body with a valid bot identifier";
    } else if (message.includes("recipient") || message.includes("to")) {
      suggestion = "Include 'to' field with phone number or group ID (e.g., '+1234567890' or '120363...@g.us')";
    } else if (message.includes("message")) {
      suggestion = "Include 'message' field with your text content";
    }

    res.status(400).json({ 
      success: false,
      error: "Validation Error",
      errorType: "VALIDATION_ERROR",
      details: message,
      requestId,
      timestamp: new Date().toISOString(),
      troubleshooting: "Review required fields for this endpoint",
      suggestion
    });
  }

  /**
   * Handle generic controller errors
   */
  public handleControllerError(operation: string, error: unknown, res: Response): void {
    console.error(`❌ [CONTROLLER_ERROR] ${operation}:`, error);
    
    let errorType = "CONTROLLER_ERROR";
    let details = "Unknown controller error";
    
    if (error instanceof Error) {
      details = error.message;
      
      // Categorize common controller errors
      if (error.name === 'ValidationError') {
        errorType = "VALIDATION_ERROR";
      } else if (error.name === 'CastError') {
        errorType = "CAST_ERROR";
      } else if (error.message.includes('timeout')) {
        errorType = "TIMEOUT_ERROR";
      }
    }

    res.status(500).json({
      success: false,
      error: `Failed to ${operation}`,
      errorType,
      details,
      timestamp: new Date().toISOString(),
      troubleshooting: `Check the ${operation} operation parameters and system status`
    });
  }
}
