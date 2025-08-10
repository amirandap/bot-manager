import { botLogger } from '../utils/loggerWrapper';\n\n/**
 * Centralized middleware for common bot operations
 * Reduces code duplication across routes
 */

import { Request, Response, NextFunction } from "express";
import { getClient } from "../config/clientExporter";

/**
 * Extended Request interface to include bot-specific data
 */
export interface BotRequest extends Request {
  bot?: {
    requestId: string;
    client: any;
    startTime: number;
  };
}

/**
 * Middleware to add request ID and timing
 */
export function addRequestId(
  req: BotRequest,
  res: Response,
  next: NextFunction
): void {
  req.bot = {
    requestId: Date.now().toString(36),
    client: null,
    startTime: Date.now(),
  };
  next();
}

/**
 * Middleware to validate WhatsApp client availability
 */
export function validateClient(
  req: BotRequest,
  res: Response,
  next: NextFunction
): void {
  const client = getClient();

  if (!client) {
    res.status(503).json({
      success: false,
      error: "WhatsApp client not ready",
      requestId: req.bot?.requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.bot) {
    req.bot.client = client;
  }

  next();
}

/**
 * Middleware for request logging
 */
export function logRequest(
  req: BotRequest,
  res: Response,
  next: NextFunction
): void {
  const { method, originalUrl } = req;
  const requestId = req.bot?.requestId;

  console.log(
    `🔄 [BOT] ${method} ${originalUrl} - Request ${requestId} started`
  );

  // Log response
  const originalSend = res.json;
  res.json = function (body: any) {
    const duration = Date.now() - (req.bot?.startTime || 0);
    const success = body?.success !== false;
    const emoji = success ? "✅" : "❌";

    console.log(
      `${emoji} [BOT] ${method} ${originalUrl} - Request ${requestId} completed in ${duration}ms`
    );

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Middleware for error handling
 */
export function handleBotError(
  error: any,
  req: BotRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.bot?.requestId || "unknown";

  botLogger.error(`❌ [BOT] Request ${requestId} failed:`);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    error: "Internal server error",
    requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Common validation utilities
 */
export class ValidationMiddleware {
  /**
   * Validate that required fields are present
   */
  static requireFields(fields: string[]) {
    return (req: BotRequest, res: Response, next: NextFunction): void => {
      const missing = fields.filter((field) => !req.body[field]);

      if (missing.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(", ")}`,
          requestId: req.bot?.requestId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  }

  /**
   * Validate file upload requirements
   */
  static requireFile(fileTypes?: string[]) {
    return (req: BotRequest, res: Response, next: NextFunction): void => {
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: "File upload required",
          acceptedTypes: fileTypes,
          requestId: req.bot?.requestId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (fileTypes && !fileTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          error: `Invalid file type. Accepted: ${fileTypes.join(", ")}`,
          received: file.mimetype,
          requestId: req.bot?.requestId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  }
}
