import { Response } from "express";
import { ErrorObject } from "../types/types";

/**
 * Utility for standardized HTTP response formatting
 * Consolidates duplicate response patterns across the codebase
 */
export class ResponseUtils {
  /**
   * Builds a standardized error response with timestamp
   */
  public static errorResponse(
    res: Response,
    statusCode: number,
    errorMessage: string,
    additionalData?: Record<string, unknown>
  ): void {
    const responseData = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    res.status(statusCode).json(responseData);
  }

  /**
   * Builds a standardized success response with timestamp
   */
  public static successResponse(
    res: Response,
    data: Record<string, unknown>,
    statusCode: number = 200
  ): void {
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
    };

    res.status(statusCode).json(responseData);
  }

  /**
   * Builds a standardized mixed results response (207 Multi-Status)
   */
  public static mixedResponse(
    res: Response,
    messagesSent: string[],
    errors: ErrorObject[]
  ): void {
    const statusCode = ResponseUtils.getResponseStatus(errors, messagesSent);
    
    res.status(statusCode).json({
      success: errors.length === 0,
      messagesSent,
      errors,
      totalSent: messagesSent.length,
      totalErrors: errors.length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Determines appropriate HTTP status code based on results
   */
  private static getResponseStatus(
    errors: ErrorObject[],
    messagesSent: string[]
  ): number {
    if (errors.length === 0) return 200; // All successful
    if (messagesSent.length === 0) return 500; // All failed
    return 207; // Mixed results (multi-status)
  }

  /**
   * Common 400-level error responses
   */
  public static badRequest(res: Response, message: string): void {
    ResponseUtils.errorResponse(res, 400, message);
  }

  public static unauthorized(res: Response, message: string = "Unauthorized"): void {
    ResponseUtils.errorResponse(res, 401, message);
  }

  public static forbidden(res: Response, message: string = "Forbidden"): void {
    ResponseUtils.errorResponse(res, 403, message);
  }

  public static notFound(res: Response, message: string = "Not found"): void {
    ResponseUtils.errorResponse(res, 404, message);
  }

  /**
   * Common 500-level error responses
   */
  public static internalServerError(res: Response, message: string = "Internal server error"): void {
    ResponseUtils.errorResponse(res, 500, message);
  }

  public static serviceUnavailable(res: Response, message: string = "Service unavailable"): void {
    ResponseUtils.errorResponse(res, 503, message);
  }
}

export default ResponseUtils;
