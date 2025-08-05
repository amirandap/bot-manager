import { Request, Response } from "express";

/**
 * Generic request validator for message endpoints
 */
export default class RequestValidator {
  /**
   * Validates basic message request with optional file
   */
  static validateMessageRequest(req: Request, res: Response, requiresMessage: boolean = true): {
    isValid: boolean;
    body?: any;
    file?: Express.Multer.File;
  } {
    const body = req.body;
    const file = req.file as Express.Multer.File;
    
    console.log("Payload received: ", body);

    if (requiresMessage && !body.message && !file) {
      res.status(400).json({ 
        success: false,
        error: "Missing message or file parameter",
        timestamp: new Date().toISOString()
      });
      return { isValid: false };
    }

    return { isValid: true, body, file };
  }

  /**
   * Validates that required recipients are present
   */
  static validateRecipients(req: Request, res: Response): {
    isValid: boolean;
    body?: any;
  } {
    const body = req.body;
    const { to, phoneNumber, group_id, discorduserid } = body;

    if (!to && !phoneNumber && !group_id && !discorduserid) {
      res.status(400).json({
        success: false,
        error: "Missing recipient information. Provide 'to', 'phoneNumber', 'group_id', or 'discorduserid'",
        timestamp: new Date().toISOString()
      });
      return { isValid: false };
    }

    return { isValid: true, body };
  }

  /**
   * Validates file upload requirements
   */
  static validateFileUpload(req: Request, res: Response, fileType: string, acceptedTypes: string[]): {
    isValid: boolean;
    file?: Express.Multer.File;
    body?: any;
  } {
    const file = req.file as Express.Multer.File;
    const body = req.body;

    if (!file) {
      res.status(400).json({
        success: false,
        error: `VALIDATION_ERROR: ${fileType} file is required`,
        acceptedTypes,
        timestamp: new Date().toISOString()
      });
      return { isValid: false };
    }

    return { isValid: true, file, body };
  }

  /**
   * Builds standardized response object
   */
  static buildResponse(messagesSent: string[], errors: any[]): {
    success: boolean;
    messagesSent: string[];
    errors: any[];
    totalSent: number;
    totalErrors: number;
  } {
    return {
      success: errors.length === 0,
      messagesSent,
      errors,
      totalSent: messagesSent.length,
      totalErrors: errors.length,
    };
  }

  /**
   * Gets appropriate HTTP status code based on results
   */
  static getResponseStatus(errors: any[], messagesSent: string[]): number {
    if (errors.length === 0) return 200; // All successful
    if (messagesSent.length === 0) return 500; // All failed
    return 207; // Partial success (Multi-Status)
  }
}
