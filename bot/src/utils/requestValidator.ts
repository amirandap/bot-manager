import { Request, Response } from "express";
import {
  SendResponse,
  BaseMessageRequestBody,
  ValidationResult,
  RecipientValidationResult,
  FileValidationResult,
  ErrorObject,
} from "../types/types";

/**
 * Generic request validator for message endpoints
 */
export default class RequestValidator {
  /**
   * Validates basic message request with optional file
   */
  public static validateMessageRequest(
    req: Request,
    res: Response,
    requiresMessage: boolean = true
  ): ValidationResult {
    const body = req.body as BaseMessageRequestBody;
    const file = req.file as Express.Multer.File;

    // Remove console.log for production - use proper logging instead

    if (requiresMessage && !body.message && !file) {
      res.status(400).json({
        success: false,
        error: "Missing message or file parameter",
        timestamp: new Date().toISOString(),
      });
      return { isValid: false };
    }

    return { isValid: true, body, file };
  }

  /**
   * Validates that required recipients are present
   */
  public static validateRecipients(
    req: Request,
    res: Response
  ): RecipientValidationResult {
    const body = req.body as BaseMessageRequestBody;
    const { to, phoneNumber, group_id, discorduserid } = body;

    if (!to && !phoneNumber && !group_id && !discorduserid) {
      res.status(400).json({
        success: false,
        error:
          "Missing recipient information. Provide 'to', 'phoneNumber', 'group_id', or 'discorduserid'",
        timestamp: new Date().toISOString(),
      });
      return { isValid: false };
    }

    return { isValid: true, body };
  }

  /**
   * Validates file upload requirements
   */
  public static validateFileUpload(
    req: Request,
    res: Response,
    fileType: string,
    acceptedTypes: string[]
  ): FileValidationResult {
    const file = req.file as Express.Multer.File;
    const body = req.body as BaseMessageRequestBody;

    if (!file) {
      res.status(400).json({
        success: false,
        error: `VALIDATION_ERROR: ${fileType} file is required`,
        acceptedTypes,
        timestamp: new Date().toISOString(),
      });
      return { isValid: false };
    }

    return { isValid: true, file, body };
  }

  /**
   * Builds standardized response object
   */
  public static buildResponse(
    messagesSent: string[],
    errors: ErrorObject[]
  ): SendResponse {
    return {
      success: errors.length === 0,
      messagesSent,
      errors,
      totalSent: messagesSent.length,
      totalErrors: errors.length,
    };
  }

  /**
   * Determines HTTP status code based on results
   */
  public static getResponseStatus(
    errors: ErrorObject[],
    messagesSent: string[]
  ): number {
    if (errors.length === 0) return 200; // All successful
    if (messagesSent.length === 0) return 500; // All failed
    return 207; // Mixed results (multi-status)
  }
}
