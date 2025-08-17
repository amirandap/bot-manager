import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/LoggerService';

/**
 * Middleware to handle text/plain payloads and convert them to JSON
 * This handles cases where external services send plain text instead of JSON
 */
export const textToJsonMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.get('Content-Type') || '';
  
  // Only process text/plain content type
  if (!contentType.includes('text/plain') && !contentType.includes('text/html')) {
    return next();
  }

  // Log that we're processing a text payload
  logger.logRequest(req, { processingTextPayload: true });

  try {
    // Get the raw body (should be a string)
    const rawBody = req.body;
    
    if (typeof rawBody !== 'string') {
      return next();
    }

    // Try to detect if it's actually JSON disguised as text
    let convertedPayload: any;
    
    if (rawBody.trim().startsWith('{') && rawBody.trim().endsWith('}')) {
      // Looks like JSON, try to parse it
      try {
        convertedPayload = JSON.parse(rawBody);
        logger.logTextPayload(req, convertedPayload);
        req.body = convertedPayload;
        return next();
      } catch (jsonError) {
        // Not valid JSON, continue with text processing
      }
    }

    // Try to extract structured data from text
    convertedPayload = extractDataFromText(rawBody);
    
    if (convertedPayload) {
      logger.logTextPayload(req, convertedPayload);
      req.body = convertedPayload;
    } else {
      // If we can't extract structured data, treat as a simple message
      const defaultPayload = {
        message: rawBody.trim(),
        // Try to extract botId and recipient from query parameters or headers
        botId: req.query.botId || req.headers['x-bot-id'],
        to: req.query.to || req.query.phoneNumber || req.headers['x-recipient']
      };
      
      logger.logTextPayload(req, defaultPayload);
      req.body = defaultPayload;
    }

  } catch (error) {
    logger.logError(error as Error, { 
      context: 'textToJsonMiddleware',
      contentType,
      bodyType: typeof req.body 
    });
    
    // Continue with original body if conversion fails
  }

  next();
};

/**
 * Extract structured data from plain text
 * Supports various formats like key-value pairs, URLs, etc.
 */
function extractDataFromText(text: string): any | null {
  const lines = text.trim().split('\n');
  const data: any = {};
  let hasStructuredData = false;

  for (const line of lines) {
    // Try to match key-value patterns
    const keyValueMatch = line.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*[:=]\s*(.+)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;
      data[key] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
      hasStructuredData = true;
      continue;
    }

    // Try to match JSON-like patterns
    const jsonMatch = line.match(/^"([^"]+)"\s*:\s*"([^"]+)"$/);
    if (jsonMatch) {
      const [, key, value] = jsonMatch;
      data[key] = value;
      hasStructuredData = true;
      continue;
    }

    // Try to match URL patterns for trello-like integrations
    const urlMatch = line.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      data.url = urlMatch[0];
      hasStructuredData = true;
      continue;
    }

    // Try to match phone number patterns
    const phoneMatch = line.match(/(\+?[\d\s\-\(\)]{10,})/);
    if (phoneMatch) {
      data.phoneNumber = phoneMatch[1].replace(/[\s\-\(\)]/g, '');
      hasStructuredData = true;
      continue;
    }

    // If no pattern matches and we don't have a message yet, use as message
    if (!data.message && line.trim()) {
      data.message = line.trim();
      hasStructuredData = true;
    }
  }

  // If we found structured data, return it
  if (hasStructuredData) {
    // Clean up common field name variations
    if (data.phoneNumber && !data.to) {
      data.to = data.phoneNumber;
      delete data.phoneNumber;
    }
    
    if (data.url && !data.message) {
      data.message = `Shared link: ${data.url}`;
    }

    return data;
  }

  return null;
}

/**
 * Enhanced JSON error handling middleware
 */
export const enhancedJsonErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Handle JSON syntax errors specifically
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    logger.logJsonError(error, req, req.body);
    
    return res.status(400).json({
      success: false,
      error: 'JSON_PARSE_ERROR',
      message: 'Invalid JSON format in request body',
      details: error.message,
      hint: 'Check your JSON syntax or use text/plain content-type for plain text',
      timestamp: new Date().toISOString()
    });
  }

  next(error);
};

/**
 * Enhanced request logging middleware
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log the incoming request
  logger.logRequest(req);

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    logger.getPinoLogger().info({
      response: {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        bodySize: JSON.stringify(body).length,
        success: body?.success !== false
      }
    }, `📤 Response ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`);

    return originalJson.call(this, body);
  };

  next();
};
