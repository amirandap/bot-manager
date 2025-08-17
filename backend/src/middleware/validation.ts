import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/LoggerService';

/**
 * Enhanced payload validation middleware for send-message endpoint
 */
export const validateSendMessagePayload = (req: Request, res: Response, next: NextFunction) => {
  const { botId, to, message } = req.body;
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required field validation
  if (!botId) {
    errors.push('botId is required');
  } else if (typeof botId !== 'string') {
    errors.push('botId must be a string');
  }
  
  if (!to) {
    errors.push('to (phone number or chat ID) is required');
  } else if (typeof to !== 'string') {
    errors.push('to must be a string');
  }
  
  if (!message && !(req as any).file) {
    errors.push('message or file is required');
  }
  
  // Optional validations and warnings
  if (to && typeof to === 'string') {
    // Check phone number format
    if (to.includes('@c.us') || to.includes('@g.us')) {
      // WhatsApp format is correct
    } else if (to.match(/^\+?[\d\s\-\(\)]{8,}$/)) {
      // Looks like a phone number, suggest proper format
      warnings.push('Phone numbers should include country code and @c.us suffix for individual chats');
    } else {
      warnings.push('Recipient format may be invalid. Use: +1234567890@c.us for individuals or 120363...@g.us for groups');
    }
  }
  
  if (message && typeof message === 'string' && message.length > 4096) {
    warnings.push('Message is very long (>4096 chars), it may be truncated by WhatsApp');
  }
  
  // Log validation results
  if (errors.length > 0) {
    logger.logValidationError(errors, req, { warnings });
    
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      received: {
        fields: Object.keys(req.body),
        hasFile: !!(req as any).file,
        contentType: req.get('Content-Type')
      },
      expected: {
        required: ['botId', 'to', 'message (or file)'],
        formats: {
          botId: 'string (e.g., "whatsapp-bot-1234567890")',
          to: 'string (e.g., "+1234567890@c.us" or "120363...@g.us")',
          message: 'string (optional if file is provided)'
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  if (warnings.length > 0) {
    logger.getPinoLogger().warn({ 
      validation: { warnings, endpoint: req.path } 
    }, `⚠️ Validation warnings: ${warnings.join(', ')}`);
  }
  
  next();
};

/**
 * Sanitize and normalize payload data
 */
export const sanitizePayload = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    const originalBody = { ...req.body };
    
    // Clean empty fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === '' || req.body[key] === null || req.body[key] === undefined) {
        delete req.body[key];
      }
    });
    
    // Normalize phone numbers/chat IDs
    if (req.body.to && typeof req.body.to === 'string') {
      let normalized = req.body.to.trim();
      
      // Handle different phone number formats
      if (normalized.startsWith('+') && !normalized.includes('@')) {
        // Convert +1234567890 to 1234567890@c.us
        normalized = normalized.replace('+', '') + '@c.us';
      } else if (normalized.match(/^\d+$/) && normalized.length >= 10) {
        // Convert plain numbers to WhatsApp format
        normalized = normalized + '@c.us';
      }
      
      req.body.to = normalized;
      
      if (originalBody.to !== normalized) {
        logger.getPinoLogger().info({
          normalization: {
            field: 'to',
            original: originalBody.to,
            normalized: normalized
          }
        }, `🔧 Normalized recipient format`);
      }
    }
    
    // Trim message content
    if (req.body.message && typeof req.body.message === 'string') {
      req.body.message = req.body.message.trim();
    }
    
    // Convert port numbers to integers
    if (req.body.apiPort && typeof req.body.apiPort === 'string') {
      req.body.apiPort = parseInt(req.body.apiPort, 10);
    }
  }
  
  next();
};

/**
 * Enhanced multer error handler
 */
export const handleMulterErrors = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error && error.code) {
    logger.logFileUploadError(error, req);
    
    let message = 'File upload error';
    let hint = '';
    
    switch (error.code) {
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field name';
        hint = 'Use "file" as the field name: -F "file=@yourfile.png"';
        break;
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        hint = 'Maximum file size is 16MB';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        hint = 'Only one file per request is allowed';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        hint = 'Reduce the number of form fields';
        break;
      default:
        message = error.message || 'Unknown file upload error';
    }
    
    return res.status(400).json({
      success: false,
      error: 'FILE_UPLOAD_ERROR',
      message,
      hint,
      details: {
        code: error.code,
        field: error.field
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next(error);
};

/**
 * Global error handler with Pino logging
 */
export const globalErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Log the error with full context
  logger.logError(error, {
    requestId,
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: req.headers,
      body: req.body,
      ip: req.ip
    }
  });
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(error);
  }
  
  // Handle specific error types with detailed responses
  
  // JSON Parse Errors
  if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    logger.logJsonError(error, req);
    return res.status(400).json({
      success: false,
      error: 'JSON_PARSE_ERROR',
      message: 'Invalid JSON format in request body',
      hint: 'Check your JSON syntax and ensure proper escaping',
      details: {
        syntaxError: error.message,
        position: error.message.match(/position (\d+)/)?.[1] || 'unknown'
      },
      example: {
        correct: '{"botId": "test-bot", "to": "+1234567890", "message": "Hello"}',
        common_mistakes: [
          'Missing quotes around strings',
          'Trailing commas',
          'Unescaped special characters'
        ]
      },
      requestId,
      timestamp
    });
  }
  
  // Multer File Upload Errors
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE_FIELD',
      message: 'Unexpected file field. Use "file" as the field name.',
      hint: 'For file uploads, use: -F "file=@yourfile.png"',
      details: {
        expectedField: 'file',
        receivedField: error.field,
        allowedFormats: ['image/*', 'video/*', 'audio/*', 'application/pdf']
      },
      examples: {
        curl: 'curl -X POST -F "file=@image.jpg" -F "botId=test-bot" -F "to=+1234567890" -F "message=Caption" http://localhost:3001/api/bots/send-message',
        javascript: 'const formData = new FormData(); formData.append("file", fileInput.files[0]); formData.append("botId", "test-bot");'
      },
      requestId,
      timestamp
    });
  }
  
  if (error.name === 'MulterError') {
    let specificHint = 'Ensure you\'re using the correct field name and file format';
    let maxSize = '16MB';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        specificHint = `File too large. Maximum size is ${maxSize}`;
        break;
      case 'LIMIT_FILE_COUNT':
        specificHint = 'Too many files. Only one file per request is allowed';
        break;
      case 'LIMIT_FIELD_COUNT':
        specificHint = 'Too many form fields. Reduce the number of fields';
        break;
      case 'LIMIT_FIELD_KEY':
        specificHint = 'Field name too long. Use shorter field names';
        break;
      case 'LIMIT_FIELD_VALUE':
        specificHint = 'Field value too long. Reduce the length of field values';
        break;
    }
    
    return res.status(400).json({
      success: false,
      error: 'FILE_UPLOAD_ERROR',
      message: error.message,
      hint: specificHint,
      details: {
        code: error.code,
        field: error.field,
        limits: {
          fileSize: maxSize,
          files: 1,
          fields: 10
        }
      },
      requestId,
      timestamp
    });
  }
  
  // Validation Errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message,
      hint: 'Check the required fields and their formats',
      requestId,
      timestamp
    });
  }
  
  // Connection Errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'SERVICE_UNAVAILABLE',
      message: 'Unable to connect to bot service',
      hint: 'Check if the bot is running and accessible',
      details: {
        errorCode: error.code,
        address: error.address,
        port: error.port
      },
      troubleshooting: [
        'Verify the bot is running: pm2 status',
        'Check bot logs: pm2 logs [bot-name]',
        'Ensure the bot port is accessible'
      ],
      requestId,
      timestamp
    });
  }
  
  // Network timeout errors
  if (error.code === 'ETIMEDOUT' || error.timeout) {
    return res.status(504).json({
      success: false,
      error: 'REQUEST_TIMEOUT',
      message: 'Request to bot service timed out',
      hint: 'The bot may be busy or unresponsive. Try again in a moment.',
      requestId,
      timestamp
    });
  }
  
  // Generic error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    requestId,
    ...(isDevelopment && { 
      details: error.message,
      stack: error.stack 
    }),
    timestamp
  });
};
