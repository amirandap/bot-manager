# 🛡️ Error Handling System

## Overview

The Bot Manager implements a sophisticated error handling system that distinguishes between different types of errors and provides appropriate responses. This system is designed to prevent false error notifications while ensuring critical issues are properly reported.

## Error Classification

### 1. POST_SEND_ERROR_PATTERNS
These errors occur **after** a message has been successfully delivered and should **NOT** trigger fallback messages:

```typescript
const POST_SEND_ERROR_PATTERNS = [
  'Cannot read properties of undefined (reading \'serialize\')',
  'Cannot read properties of null (reading \'serialize\')',
  'Evaluation failed: TypeError: Cannot read properties',
  'serialize',
  'getMessageModel',
  'SESSION_CORRUPTED'
];
```

**Behavior**: 
- ✅ Message marked as successfully sent
- 🚫 No fallback message sent
- 📝 Error logged for monitoring
- 💡 User informed that message was delivered despite the error

### 2. CRITICAL_ERROR_PATTERNS
These errors occur **before** or **during** message delivery and **SHOULD** trigger fallback messages:

```typescript
const CRITICAL_ERROR_PATTERNS = [
  'RATE_LIMIT',
  'AUTHENTICATION_FAILURE',
  'PERMISSION_DENIED',
  'NETWORK_ERROR',
  'VALIDATION_ERROR',
  'RECIPIENT_NOT_FOUND'
];
```

**Behavior**:
- ❌ Message marked as failed
- 📨 Fallback message sent to notify of failure
- 📝 Error logged with high priority
- 🔧 Troubleshooting guidance provided

## Error Handler Implementation

### Core Function: `shouldSendFallback(error)`

```typescript
export function shouldSendFallback(error: any): boolean {
  const errorString = typeof error === 'string' ? error : String(error);
  
  // Check if it's a post-send error (ignore these)
  const isPostSendError = POST_SEND_ERROR_PATTERNS.some(pattern => 
    errorString.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isPostSendError) {
    console.log(`⚠️ [POST_SEND_ERROR] Ignoring post-delivery error: ${errorString}`);
    return false; // Don't send fallback
  }
  
  // Check if it's a critical error (send fallback for these)
  const isCriticalError = CRITICAL_ERROR_PATTERNS.some(pattern => 
    errorString.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isCriticalError) {
    console.log(`🚨 [CRITICAL_ERROR] Sending fallback for: ${errorString}`);
    return true; // Send fallback
  }
  
  // For unknown errors, default to sending fallback (safe approach)
  console.log(`❓ [UNKNOWN_ERROR] Defaulting to fallback for: ${errorString}`);
  return true;
}
```

### Usage Example

```typescript
try {
  const result = await client.sendMessage(chatId, message);
  console.log('✅ Message sent successfully');
  return { success: true, result };
} catch (error) {
  const shouldSendFallbackMessage = shouldSendFallback(error);
  
  if (shouldSendFallbackMessage) {
    // Send fallback notification
    await sendFallbackMessage(fallbackNumber, error);
    return { success: false, error: error.message };
  } else {
    // Treat as successful despite post-send error
    console.log('✅ Treating as successful send despite post-send error');
    return { success: true, note: 'Message delivered despite serialization error' };
  }
}
```

## Backend Error Classification

The backend categorizes errors for better handling and debugging:

### Error Types

1. **BACKEND_ERROR** (404)
   - Bot configuration issues
   - Bot not found in config

2. **BOT_ERROR** (502) 
   - Bot API returned an error
   - Bot-specific failures

3. **CONNECTION_ERROR** (503)
   - Cannot connect to bot
   - Network/timeout issues

4. **REQUEST_SETUP_ERROR** (400)
   - Invalid request format
   - Missing required parameters

5. **VALIDATION_ERROR** (400)
   - Input validation failures
   - Invalid recipient formats

6. **UNKNOWN_ERROR** (500)
   - Unexpected errors
   - System failures

### Response Format

```json
{
  "success": false,
  "error": "Failed to send message",
  "errorType": "BOT_ERROR",
  "details": "BOT_ERROR: Bot API returned 500 - Internal Server Error",
  "requestId": 1234567890,
  "timestamp": "2025-07-31T15:30:00.000Z",
  "troubleshooting": "Check bot logs and WhatsApp session status"
}
```

## Smart Endpoint Routing

The system automatically selects the optimal bot endpoint based on recipient types:

```typescript
// Phone numbers only
{
  "phoneNumber": ["+1234567890", "+0987654321"]
} 
// → Routes to: /send-to-phone

// Groups only  
{
  "groupId": ["123@g.us", "456@g.us"]
}
// → Routes to: /send-to-group

// Mixed recipients
{
  "to": ["+1234567890", "123@g.us"]  
}
// → Routes to: /send-broadcast
```

## Monitoring and Logging

### Log Levels

- **INFO**: Successful operations, routing decisions
- **WARN**: Post-send errors (ignored but monitored)
- **ERROR**: Critical errors requiring attention
- **DEBUG**: Detailed troubleshooting information

### Log Format

```
2025-07-31T15:22:00: ⚠️ [GROUP_MESSAGE] Ignoring post-send error for 120363415129628065@g.us:
2025-07-31T15:22:00:    Type: SESSION_CORRUPTED
2025-07-31T15:22:00:    Description: WhatsApp session serialization error (post-send)
2025-07-31T15:22:00:    ✅ Message was delivered successfully - this is a post-delivery error
```

## Best Practices

### For Developers

1. **Always use `shouldSendFallback()`** before sending error notifications
2. **Log all errors** regardless of whether fallback is sent
3. **Include context** in error messages (recipient, message type, etc.)
4. **Use structured logging** for better monitoring
5. **Test error scenarios** to ensure proper classification

### For Operations

1. **Monitor post-send error rates** for system health
2. **Alert on critical error patterns** for immediate response  
3. **Track fallback message frequency** to identify issues
4. **Review unknown errors** to improve classification
5. **Update error patterns** based on new WhatsApp behaviors

## Configuration

Error patterns can be updated in `/bot/src/utils/errorHandler.ts`:

```typescript
// Add new post-send patterns
const POST_SEND_ERROR_PATTERNS = [
  'serialize',
  'getMessageModel',
  // Add new patterns here
];

// Add new critical patterns  
const CRITICAL_ERROR_PATTERNS = [
  'RATE_LIMIT',
  'AUTHENTICATION_FAILURE', 
  // Add new patterns here
];
```

## Testing

Test the error handling system using specific error scenarios:

```bash
# Test with known post-send error
curl -X POST http://localhost:3001/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "test-bot",
    "to": "120363415129628065@g.us",
    "message": "Test message"
  }'
```

Expected: Message delivered, no fallback sent, post-send error logged and ignored.
