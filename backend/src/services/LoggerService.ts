import pino from 'pino';
import { Request } from 'express';

/**
 * Enhanced Logger Service using Pino
 * Provides structured logging with different levels and contexts
 */
export class LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        }
      } : undefined,
      base: {
        service: 'bot-manager-backend',
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  }

  /**
   * Log incoming request with sanitized details
   */
  logRequest(req: Request, context?: any) {
    const requestData = {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      hasFile: !!(req as any).file,
      ...context
    };

    this.logger.info({ request: requestData }, `📨 Incoming ${req.method} ${req.path}`);
  }

  /**
   * Log JSON parsing errors with detailed context
   */
  logJsonError(error: Error, req: Request, rawBody?: any) {
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      request: {
        method: req.method,
        path: req.path,
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        bodySnippet: typeof rawBody === 'string' ? rawBody.substring(0, 200) : rawBody
      }
    };

    this.logger.error({ ...errorData }, `❌ JSON Parse Error: ${error.message}`);
  }

  /**
   * Log validation errors
   */
  logValidationError(errors: string[], req: Request, context?: any) {
    const validationData = {
      errors,
      receivedFields: Object.keys(req.body || {}),
      hasFile: !!(req as any).file,
      endpoint: req.path,
      ...context
    };

    this.logger.warn({ validation: validationData }, `⚠️ Validation Error: ${errors.join(', ')}`);
  }

  /**
   * Log successful operations
   */
  logSuccess(message: string, data?: any) {
    this.logger.info({ data }, `✅ ${message}`);
  }

  /**
   * Log bot communication
   */
  logBotCommunication(botId: string, endpoint: string, method: string, status: 'start' | 'success' | 'error', data?: any) {
    const logData = {
      botId,
      endpoint,
      method,
      ...data
    };

    switch (status) {
      case 'start':
        this.logger.info({ bot: logData }, `🤖 Bot Request Started: ${botId} → ${endpoint}`);
        break;
      case 'success':
        this.logger.info({ bot: logData }, `✅ Bot Request Success: ${botId} → ${endpoint}`);
        break;
      case 'error':
        this.logger.error({ bot: logData }, `❌ Bot Request Failed: ${botId} → ${endpoint}`);
        break;
    }
  }

  /**
   * Log multer/file upload errors
   */
  logFileUploadError(error: any, req: Request) {
    const fileData = {
      error: {
        name: error.name,
        message: error.message,
        code: error.code
      },
      request: {
        method: req.method,
        path: req.path,
        contentType: req.get('Content-Type'),
        fields: Object.keys(req.body || {})
      }
    };

    this.logger.error({ file: fileData }, `📁 File Upload Error: ${error.message}`);
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(req: Request, remaining: number) {
    const rateLimitData = {
      ip: req.ip,
      path: req.path,
      remaining,
      userAgent: req.get('User-Agent')
    };

    this.logger.warn({ rateLimit: rateLimitData }, `🚦 Rate Limit Warning: ${remaining} requests remaining`);
  }

  /**
   * Log text/plain payload processing
   */
  logTextPayload(req: Request, convertedPayload: any) {
    const textData = {
      originalContentType: req.get('Content-Type'),
      bodyLength: req.body?.length || 0,
      convertedTo: 'application/json',
      convertedPayload
    };

    this.logger.info({ textConversion: textData }, `📝 Text Payload Converted: ${req.path}`);
  }

  /**
   * Generic error logging
   */
  logError(error: Error, context?: any) {
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      ...context
    };

    this.logger.error({ ...errorData }, `💥 Error: ${error.message}`);
  }

  /**
   * Sanitize sensitive headers
   */
  private sanitizeHeaders(headers: any) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any) {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    
    if (typeof body === 'object') {
      const sanitized = { ...body };
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });
      return sanitized;
    }
    
    // For string bodies, truncate if too long
    if (typeof body === 'string' && body.length > 500) {
      return body.substring(0, 500) + '... [TRUNCATED]';
    }
    
    return body;
  }

  /**
   * Get the underlying Pino logger for advanced usage
   */
  getPinoLogger(): pino.Logger {
    return this.logger;
  }
}

// Export singleton instance
export const logger = new LoggerService();
