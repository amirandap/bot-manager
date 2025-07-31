# 🎯 Smart Endpoint Routing System

## Overview

The Bot Manager implements intelligent endpoint routing that automatically selects the optimal bot endpoint based on message recipients. This system improves performance, reduces complexity, and provides better error handling.

## Routing Logic

### Recipient Classification

The system analyzes all recipients and classifies them into two categories:

```typescript
// Phone numbers (individual contacts)
const phones = recipients.filter(r => !r.includes('@g.us'));

// WhatsApp groups  
const groups = recipients.filter(r => r.includes('@g.us'));
```

### Endpoint Selection

Based on the recipient distribution, the system selects the optimal endpoint:

| Recipient Mix | Endpoint | Message Type | Description |
|---------------|----------|--------------|-------------|
| **Phones only** | `/send-to-phone` | `INDIVIDUAL` / `BROADCAST` | Single phone → INDIVIDUAL<br>Multiple phones → BROADCAST |
| **Groups only** | `/send-to-group` | `GROUP` | Single or multiple groups |
| **Mixed** | `/send-broadcast` | `HYBRID` | Phones + groups combined |
| **Unknown** | `/send-message` | `UNKNOWN` | Fallback for legacy support |

## Implementation

### Core Function: `determineOptimalEndpoint()`

```typescript
private determineOptimalEndpoint(data: any): {
  endpoint: string;
  bodyData: any; 
  messageType: string;
} {
  // Collect all recipients from various input fields
  const allRecipients = this.collectRecipients(data);
  
  // Classify recipients
  const groups = allRecipients.filter(r => r.includes('@g.us'));
  const phones = allRecipients.filter(r => !r.includes('@g.us'));
  
  // Route based on recipient types
  if (groups.length > 0 && phones.length > 0) {
    return this.routeToHybrid(allRecipients, data);
  } else if (groups.length > 0) {
    return this.routeToGroups(groups, data);
  } else if (phones.length > 0) {
    return this.routeToPhones(phones, data);
  } else {
    return this.routeToFallback(data);
  }
}
```

### Unified Recipient Collection

The system supports multiple input formats for maximum compatibility:

```typescript
// Method 1: Unified 'to' field (recommended)
{
  "to": ["1234567890@c.us", "987654321@g.us", "+1555000999"]
}

// Method 2: Separate fields
{
  "phoneNumber": ["+1234567890", "+1555000999"],
  "groupId": "987654321@g.us"
}

// Method 3: Legacy support
{
  "group_id": "987654321@g.us",
  "phoneNumber": "+1234567890"
}
```

All formats are normalized into a unified recipient array.

## Routing Examples

### Example 1: Individual Phone Message

**Input:**
```json
{
  "botId": "bot-123",
  "phoneNumber": "+1234567890", 
  "message": "Hello individual user!"
}
```

**Routing Decision:**
- Recipients: `["+1234567890"]`
- Classification: 1 phone, 0 groups
- **Selected Endpoint:** `/send-to-phone`
- **Message Type:** `INDIVIDUAL`

**Bot Request:**
```json
{
  "phoneNumber": "+1234567890",
  "message": "Hello individual user!"
}
```

### Example 2: Group Message

**Input:**
```json
{
  "botId": "bot-123",
  "groupId": "120363415129628065@g.us",
  "message": "Hello group!"
}
```

**Routing Decision:**
- Recipients: `["120363415129628065@g.us"]`
- Classification: 0 phones, 1 group
- **Selected Endpoint:** `/send-to-group`
- **Message Type:** `GROUP`

**Bot Request:**
```json
{
  "groupId": "120363415129628065@g.us", 
  "message": "Hello group!"
}
```

### Example 3: Hybrid Message

**Input:**
```json
{
  "botId": "bot-123",
  "to": ["+1234567890", "+1555000999", "120363415129628065@g.us"],
  "message": "Hello everyone!"
}
```

**Routing Decision:**
- Recipients: `["+1234567890", "+1555000999", "120363415129628065@g.us"]`
- Classification: 2 phones, 1 group
- **Selected Endpoint:** `/send-broadcast`
- **Message Type:** `HYBRID`

**Bot Request:**
```json
{
  "to": ["+1234567890", "+1555000999", "120363415129628065@g.us"],
  "message": "Hello everyone!"
}
```

### Example 4: Multiple Groups

**Input:**
```json
{
  "botId": "bot-123", 
  "groupId": ["120363415129628065@g.us", "987654321@g.us"],
  "message": "Hello all groups!"
}
```

**Routing Decision:**
- Recipients: `["120363415129628065@g.us", "987654321@g.us"]`
- Classification: 0 phones, 2 groups
- **Selected Endpoint:** `/send-to-group`
- **Message Type:** `GROUP`

**Bot Request:**
```json
{
  "groupId": ["120363415129628065@g.us", "987654321@g.us"],
  "message": "Hello all groups!"
}
```

## Response Format

All routed requests return a standardized response with routing information:

```json
{
  "success": true,
  "result": {
    "sent": ["recipient1", "recipient2"],
    "errors": []
  },
  "messageType": "HYBRID",
  "endpoint": "/send-broadcast", 
  "requestId": 1234567890,
  "timestamp": "2025-07-31T15:30:00.000Z"
}
```

## Performance Benefits

### Direct Endpoint Usage

Instead of the bot parsing unified requests, the backend pre-routes to specific endpoints:

**Before (Legacy):**
```
Backend → Bot /send-message → Bot parses → Bot routes internally → WhatsApp
```

**After (Smart Routing):**
```
Backend analyzes → Backend routes → Bot specific endpoint → WhatsApp
```

### Reduced Processing

- ✅ **Backend handles routing logic** (not repeated per bot)
- ✅ **Bot endpoints are specialized** for their specific use case
- ✅ **Less parsing overhead** in bot instances
- ✅ **Better error categorization** based on endpoint type

## Compatibility

### Backward Compatibility

The system maintains full backward compatibility:

- Legacy `/send-message` endpoint still supported
- All existing field names (`phoneNumber`, `group_id`, etc.) still work
- Existing integrations continue working without changes

### Forward Compatibility

New features can be easily added:

```typescript
// Future: Add support for Discord channels
const discordChannels = allRecipients.filter(r => r.includes('@discord'));

if (discordChannels.length > 0) {
  return this.routeToDiscord(discordChannels, data);
}
```

## Monitoring and Debugging

### Routing Logs

The system logs all routing decisions:

```
🔄 [BACKEND] HYBRID message → /send-broadcast (2 phones + 1 groups)
🏢 [BACKEND] GROUP message → /send-to-group (3 group(s))
📱 [BACKEND] PHONE message → /send-to-phone (1 phone(s))
```

### Request Tracking

Each request includes tracking information:

```json
{
  "requestId": 1234567890,
  "messageType": "HYBRID",
  "endpoint": "/send-broadcast",
  "originalData": { /* original request */ },
  "normalizedData": { /* processed request */ }
}
```

## Configuration

### Adding New Endpoints

To add support for a new bot endpoint:

1. **Update the routing logic:**
```typescript
else if (newRecipientType.length > 0) {
  return {
    endpoint: "/new-endpoint",
    bodyData: { /* formatted data */ },
    messageType: "NEW_TYPE"
  };
}
```

2. **Update the response types:**
```typescript
enum MessageType {
  INDIVIDUAL = "INDIVIDUAL",
  GROUP = "GROUP", 
  HYBRID = "HYBRID",
  BROADCAST = "BROADCAST",
  NEW_TYPE = "NEW_TYPE", // Add new type
  UNKNOWN = "UNKNOWN"
}
```

3. **Update the bot to handle the new endpoint**

### Custom Routing Rules

Custom routing rules can be added for specific use cases:

```typescript
// Example: Large group broadcasts use different endpoint
if (groups.length > 10) {
  return {
    endpoint: "/send-large-broadcast",
    bodyData: { groupIds: groups, message: data.message },
    messageType: "LARGE_GROUP_BROADCAST"
  };
}
```

## Testing

### Unit Tests

Test routing logic with various input combinations:

```typescript
describe('Smart Routing', () => {
  it('should route phone-only messages to /send-to-phone', () => {
    const result = determineOptimalEndpoint({
      phoneNumber: '+1234567890',
      message: 'test'
    });
    
    expect(result.endpoint).toBe('/send-to-phone');
    expect(result.messageType).toBe('INDIVIDUAL');
  });
  
  it('should route hybrid messages to /send-broadcast', () => {
    const result = determineOptimalEndpoint({
      to: ['+1234567890', '123@g.us'],
      message: 'test'
    });
    
    expect(result.endpoint).toBe('/send-broadcast');
    expect(result.messageType).toBe('HYBRID');
  });
});
```

### Integration Tests

Test end-to-end routing with actual bot instances:

```bash
# Test hybrid routing
curl -X POST http://localhost:3001/api/bots/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "test-bot",
    "to": ["+1234567890", "120363415129628065@g.us"],
    "message": "Hybrid test message"
  }'
```

Expected response should include `"messageType": "HYBRID"` and `"endpoint": "/send-broadcast"`.

## Best Practices

### For API Users

1. **Use the unified `to` field** for maximum flexibility
2. **Mix recipient types freely** - the system will handle routing
3. **Check the `messageType` in responses** to understand how messages were sent
4. **Use `requestId`** for tracking and debugging

### For Developers

1. **Keep routing logic centralized** in the backend
2. **Log all routing decisions** for debugging
3. **Test with various recipient combinations** 
4. **Update documentation** when adding new endpoints
5. **Maintain backward compatibility** when making changes

## Troubleshooting

### Common Issues

**Issue:** Message not sent to expected endpoint
- **Check:** Recipient format (ensure group IDs end with `@g.us`)
- **Check:** Input field names (use `to` for unified addressing)
- **Check:** Backend logs for routing decisions

**Issue:** Legacy integrations broken
- **Check:** All legacy field names still supported
- **Check:** Fallback routing to `/send-message` for unknown patterns

**Issue:** Performance degradation
- **Check:** Routing logic complexity
- **Check:** Bot endpoint specialization
- **Check:** Request parsing efficiency
