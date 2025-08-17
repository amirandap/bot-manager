import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/LoggerService';

/**
 * Enhanced JSON validation middleware with detailed logging
 */
export const validateJsonPayload = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation for non-JSON requests
  const contentType = req.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return next();
  }

  // Check if JSON parsing was successful
  if (req.body === undefined || req.body === null) {
    const error = new Error('Empty JSON body');
    logger.logJsonError(error, req);
    
    return res.status(400).json({
      success: false,
      error: 'EMPTY_JSON_BODY',
      message: 'Request body is empty or could not be parsed as JSON',
      hint: 'Ensure you are sending valid JSON data',
      details: {
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length') || '0'
      },
      examples: {
        valid: '{"botId": "test-bot", "to": "+1234567890", "message": "Hello"}',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 'calculated automatically'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Detailed field validation for send-message endpoint
 */
export const validateSendMessageFields = (req: Request, res: Response, next: NextFunction) => {
  const { botId, to, phoneNumber, group_id, groupId, message } = req.body;
  const hasFile = !!(req as any).file;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Log incoming request details
  logger.logRequest(req, {
    validation: 'send-message-fields',
    hasFile,
    fieldCount: Object.keys(req.body || {}).length
  });
  
  // Required field: botId
  if (!botId) {
    errors.push('botId is required');
    suggestions.push('Add botId field with your bot identifier (e.g., "whatsapp-bot-1234567890")');
  } else if (typeof botId !== 'string') {
    errors.push('botId must be a string');
    suggestions.push('Ensure botId is a string value, not a number or object');
  } else if (botId.trim().length === 0) {
    errors.push('botId cannot be empty');
    suggestions.push('Provide a valid bot identifier');
  }
  
  // Required field: recipient (to, phoneNumber, group_id, or groupId)
  const recipients = [to, phoneNumber, group_id, groupId].filter(Boolean);
  if (recipients.length === 0) {
    errors.push('Recipient is required: use "to", "phoneNumber", "group_id", or "groupId"');
    suggestions.push('Add one of: {"to": "+1234567890@c.us"} or {"group_id": "120363...@g.us"}');
  } else if (recipients.length > 1) {
    warnings.push('Multiple recipient fields detected. Using first available in order: to, phoneNumber, group_id, groupId');
  }
  
  // Validate recipient format
  const primaryRecipient = to || phoneNumber || group_id || groupId;
  if (primaryRecipient && typeof primaryRecipient === 'string') {
    if (primaryRecipient.includes('@g.us')) {
      // Group ID validation
      if (!primaryRecipient.match(/^\d+-\d+@g\.us$/)) {
        warnings.push('Group ID format may be invalid. Expected format: "1234567890-1234567890@g.us"');
        suggestions.push('Verify the group ID format with your WhatsApp Web client');
      }
    } else if (primaryRecipient.includes('@c.us')) {
      // Individual chat validation
      const phoneNumber = primaryRecipient.replace('@c.us', '');
      if (!phoneNumber.match(/^\+?\d{10,}$/)) {
        warnings.push('Phone number format may be invalid. Include country code.');
        suggestions.push('Use format: "+1234567890@c.us" for US numbers');
      }
    } else if (primaryRecipient.match(/^\+?\d{10,}$/)) {
      // Plain phone number - suggest WhatsApp format
      warnings.push('Plain phone number detected. Consider using WhatsApp format for reliability.');
      suggestions.push(`Use "${primaryRecipient}@c.us" instead of "${primaryRecipient}"`);
    } else {
      warnings.push('Recipient format not recognized as phone number or group ID');
      suggestions.push('Use "+1234567890@c.us" for individuals or "120363...@g.us" for groups');
    }
  }
  
  // Required field: message or file
  if (!message && !hasFile) {
    errors.push('Message content is required: use "message" field or upload a file');
    suggestions.push('Add {"message": "Your text here"} or include a file upload');
  } else if (message && typeof message !== 'string') {
    errors.push('Message must be a string');
    suggestions.push('Ensure message content is text, not an object or number');
  }
  
  // Validate mentions field if present
  if (req.body.mentions) {
    const mentions = req.body.mentions;
    
    if (typeof mentions === 'string') {
      // Single mention - validate format
      if (!mentions.includes('@c.us')) {
        warnings.push('Mention should include @c.us suffix for proper formatting');
        suggestions.push(`Use "${mentions}@c.us" instead of "${mentions}"`);
      }
    } else if (Array.isArray(mentions)) {
      // Multiple mentions - validate each
      mentions.forEach((mention, index) => {
        if (typeof mention !== 'string') {
          errors.push(`mentions[${index}] must be a string`);
        } else if (!mention.includes('@c.us')) {
          warnings.push(`mentions[${index}] should include @c.us suffix`);
          suggestions.push(`Use "${mention}@c.us" instead of "${mention}"`);
        }
      });
    } else {
      errors.push('mentions must be a string or array of strings');
      suggestions.push('Use "mentions": "18099916662@c.us" or "mentions": ["18099916662@c.us", "18291234567@c.us"]');
    }
    
    // Check if mentions in message body match mentions field
    if (message && typeof message === 'string') {
      const messageNumbers = message.match(/@(\d{10,})/g);
      if (messageNumbers) {
        const mentionNumbers = Array.isArray(mentions) ? mentions : [mentions];
        const mentionedInBody = messageNumbers.map(m => m.replace('@', ''));
        const mentionedInField = mentionNumbers.map(m => m.replace('@c.us', ''));
        
        const missingMentions = mentionedInBody.filter(num => 
          !mentionedInField.includes(num)
        );
        
        if (missingMentions.length > 0) {
          warnings.push(`Numbers mentioned in message (@${missingMentions.join(', @')}) are not included in mentions field`);
          suggestions.push(`Add missing mentions: ${missingMentions.map(n => `"${n}@c.us"`).join(', ')}`);
        }
      }
    }
    
    logger.getPinoLogger().info({
      mentions: {
        provided: mentions,
        count: Array.isArray(mentions) ? mentions.length : 1,
        messageHasMentions: !!(message && message.match(/@\d+/))
      }
    }, `📢 Mentions field provided with ${Array.isArray(mentions) ? mentions.length : 1} mention(s)`);
  }

  // Message length validation
  if (message && typeof message === 'string') {
    if (message.trim().length === 0 && !hasFile) {
      errors.push('Message cannot be empty when no file is provided');
      suggestions.push('Provide message content or upload a file');
    } else if (message.length > 4096) {
      warnings.push('Message is very long (>4096 chars), it may be truncated by WhatsApp');
      suggestions.push('Consider splitting long messages or using file attachments');
    }
  }
  
  // File validation
  if (hasFile) {
    const file = (req as any).file;
    const maxSize = 16 * 1024 * 1024; // 16MB
    
    if (file.size > maxSize) {
      errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 16MB`);
      suggestions.push('Compress your file or use a smaller version');
    }
    
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/msword', 'application/vnd.'];
    const isAllowedType = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (!isAllowedType) {
      warnings.push(`File type "${file.mimetype}" may not be supported by WhatsApp`);
      suggestions.push('Use common formats: JPG, PNG, MP4, PDF, DOC, etc.');
    }
    
    logger.getPinoLogger().info({
      fileUpload: {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        sizeFormatted: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      }
    }, `📎 File uploaded: ${file.originalname}`);
  }
  
  // Log validation results
  if (errors.length > 0) {
    logger.logValidationError(errors, req, { 
      warnings, 
      suggestions,
      receivedFields: Object.keys(req.body || {}),
      hasFile 
    });
    
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      },
      received: {
        fields: Object.keys(req.body || {}),
        hasFile,
        contentType: req.get('Content-Type'),
        fileInfo: hasFile ? {
          name: (req as any).file?.originalname,
          size: (req as any).file?.size,
          type: (req as any).file?.mimetype
        } : undefined
      },
      expected: {
        required: ['botId', 'recipient (to/phoneNumber/group_id/groupId)', 'message (or file)'],
        formats: {
          botId: 'string (e.g., "whatsapp-bot-1234567890")',
          to: 'string (e.g., "+1234567890@c.us")',
          phoneNumber: 'string (e.g., "+1234567890")',
          group_id: 'string (e.g., "120363...@g.us")',
          message: 'string (optional if file is provided)',
          file: 'binary (images, videos, documents up to 16MB)'
        }
      },
      examples: {
        textMessage: {
          botId: 'whatsapp-bot-1234567890',
          to: '+1234567890@c.us',
          message: 'Hello! This is a test message.'
        },
        fileMessage: {
          botId: 'whatsapp-bot-1234567890',
          phoneNumber: '+1234567890',
          message: 'Please find the attached file',
          file: '[upload file via form-data]'
        },
        groupMessage: {
          botId: 'whatsapp-bot-1234567890',
          group_id: '120363027932000000@g.us',
          message: 'Hello everyone!'
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Log warnings for monitoring
  if (warnings.length > 0) {
    logger.getPinoLogger().warn({ 
      validation: { 
        warnings, 
        suggestions,
        endpoint: req.path,
        botId: req.body.botId 
      } 
    }, `⚠️ Validation warnings: ${warnings.join(', ')}`);
  }
  
  // Log successful validation
  logger.getPinoLogger().info({
    validation: {
      endpoint: req.path,
      botId: req.body.botId,
      recipient: primaryRecipient,
      hasMessage: !!message,
      hasFile,
      fieldCount: Object.keys(req.body || {}).length
    }
  }, `✅ Validation passed for ${req.path}`);
  
  next();
};

/**
 * Request sanitization and normalization
 */
export const sanitizeAndNormalizeRequest = (req: Request, res: Response, next: NextFunction) => {
  if (!req.body) return next();
  
  const originalBody = { ...req.body };
  let changes: any = {};
  
  // Clean empty fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] === '' || req.body[key] === null || req.body[key] === undefined) {
      delete req.body[key];
      changes[`removed_${key}`] = 'empty value';
    }
  });
  
  // Normalize recipient fields
  if (req.body.phoneNumber && !req.body.to) {
    req.body.to = req.body.phoneNumber;
    delete req.body.phoneNumber;
    changes.to = 'normalized from phoneNumber';
  }
  
  if (req.body.groupId && !req.body.group_id) {
    req.body.group_id = req.body.groupId;
    delete req.body.groupId;
    changes.group_id = 'normalized from groupId';
  }
  
  // Normalize phone numbers/chat IDs
  if (req.body.to && typeof req.body.to === 'string') {
    let normalized = req.body.to.trim();
    
    // Handle different phone number formats
    if (normalized.startsWith('+') && !normalized.includes('@')) {
      // Convert +1234567890 to 1234567890@c.us
      normalized = normalized.replace('+', '') + '@c.us';
      changes.to = 'added @c.us suffix';
    } else if (normalized.match(/^\d+$/) && normalized.length >= 10) {
      // Convert plain numbers to WhatsApp format
      normalized = normalized + '@c.us';
      changes.to = 'added @c.us suffix to plain number';
    }
    
    req.body.to = normalized;
  }
  
  // Trim message content and process escape sequences
  if (req.body.message && typeof req.body.message === 'string') {
    let processedMessage = req.body.message.trim();
    
    // Convert escaped newlines to actual newlines
    if (processedMessage.includes('\\n')) {
      processedMessage = processedMessage.replace(/\\n/g, '\n');
      changes.message = 'converted \\\\n to actual newlines';
      
      logger.getPinoLogger().info({
        messageProcessing: {
          original: req.body.message,
          processed: processedMessage,
          conversion: '\\\\n → actual newlines'
        }
      }, `🔄 Message newlines processed`);
    } else if (processedMessage !== req.body.message) {
      changes.message = 'trimmed whitespace';
    }
    
    req.body.message = processedMessage;
  }
  
  // Convert port numbers to integers
  if (req.body.apiPort && typeof req.body.apiPort === 'string') {
    req.body.apiPort = parseInt(req.body.apiPort, 10);
    changes.apiPort = 'converted to integer';
  }
  
  // Log normalization changes
  if (Object.keys(changes).length > 0) {
    logger.getPinoLogger().info({
      normalization: {
        changes,
        before: originalBody,
        after: req.body
      }
    }, `🔧 Request normalized: ${Object.keys(changes).join(', ')}`);
  }
  
  next();
};
