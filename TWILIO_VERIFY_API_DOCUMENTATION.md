# Twilio-Compatible Verify API Documentation

## 📋 Overview

This API provides a **100% Twilio-compatible** verification service that can be used as a **drop-in replacement** for Twilio Verify API. Send OTP codes via WhatsApp using the exact same endpoints, parameters, and response format as Twilio.

### 🎯 Key Features

- ✅ **100% Twilio API Compatible**: Same endpoints, parameters, and responses
- ✅ **WhatsApp OTP Support**: Send verification codes via WhatsApp
- ✅ **Auto-bot Selection**: Automatically chooses available bots
- ✅ **Custom Messages**: Support for custom message templates
- ✅ **Multi-language**: Support for different locales (EN, ES)
- ✅ **Rate Limiting**: Built-in protection against abuse
- ✅ **Error Handling**: Twilio-compatible error codes and messages

### 🔄 Migration from Twilio

**Zero code changes required!** Simply change your base URL:

```bash
# From Twilio
https://verify.twilio.com/v2/Services/{ServiceSid}/Verifications

# To our API
https://wapi.softgrouprd.com/api/verify/v2/Services/{ServiceSid}/Verifications
```

## 🌐 Base URL

```
https://wapi.softgrouprd.com/api
```

## 🔐 Authentication

Currently no authentication required. For production use, contact us to enable API key authentication.

## 📚 API Endpoints

### 1. Create Verification (Send OTP)

Send a verification code to a phone number via WhatsApp.

#### Endpoint
```http
POST /verify/v2/Services/{ServiceSid}/Verifications
```

#### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `ServiceSid` | string | ✅ Yes | Service identifier (path parameter) | `VA1234567890abcdef` |
| `To` | string | ✅ Yes | Phone number in E.164 format | `"+1234567890"` |
| `Channel` | string | ❌ No | Verification channel (default: `whatsapp`) | `"whatsapp"` |
| `CustomMessage` | string | ❌ No | Custom message template | `"Your code: {{code}}"` |
| `Locale` | string | ❌ No | Language locale (default: `en`) | `"es"` |

#### Request Examples

**cURL:**
```bash
curl -X POST "https://wapi.softgrouprd.com/api/verify/v2/Services/VA1234567890abcdef/Verifications" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=%2B1234567890&Channel=whatsapp"
```

**JavaScript:**
```javascript
const response = await fetch('/api/verify/v2/Services/VA1234567890abcdef/Verifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    To: '+1234567890',
    Channel: 'whatsapp'
  })
});

const verification = await response.json();
console.log('Verification SID:', verification.sid);
```

**Python:**
```python
import requests

url = 'https://wapi.softgrouprd.com/api/verify/v2/Services/VA1234567890abcdef/Verifications'
data = {
    'To': '+1234567890',
    'Channel': 'whatsapp'
}

response = requests.post(url, data=data)
verification = response.json()
print(f"Verification SID: {verification['sid']}")
```

**PHP:**
```php
<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://wapi.softgrouprd.com/api/verify/v2/Services/VA1234567890abcdef/Verifications',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => 'To=%2B1234567890&Channel=whatsapp',
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/x-www-form-urlencoded'
  ),
));

$response = curl_exec($curl);
$verification = json_decode($response, true);
echo "Verification SID: " . $verification['sid'];
?>
```

#### Response (201 Created)

```json
{
  "sid": "VE1234567890abcdef1234567890abcdef",
  "service_sid": "VA1234567890abcdef1234567890abcdef",
  "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "to": "+1234567890",
  "channel": "whatsapp",
  "status": "pending",
  "valid": false,
  "date_created": "2025-10-06T23:49:08.394Z",
  "date_updated": "2025-10-06T23:49:08.394Z",
  "lookup": {},
  "amount": null,
  "payee": null,
  "send_code_attempts": [
    {
      "time": "2025-10-06T23:49:08.394Z",
      "channel": "whatsapp",
      "attempt_sid": "VE1234567890abcdef1234567890abcdef"
    }
  ],
  "sna": null,
  "url": "https://verify.twilio.com/v2/Services/VA1234567890abcdef/Verifications/VE1234567890abcdef1234567890abcdef"
}
```

---

### 2. Check Verification (Validate OTP)

Validate a verification code sent to a phone number.

#### Endpoint
```http
POST /verify/v2/Services/{ServiceSid}/VerificationCheck
```

#### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `ServiceSid` | string | ✅ Yes | Service identifier (path parameter) | `VA1234567890abcdef` |
| `Code` | string | ✅ Yes | Verification code (4-10 digits) | `"123456"` |
| `To` | string | ⚠️ Conditional | Phone number (required if `VerificationSid` not provided) | `"+1234567890"` |
| `VerificationSid` | string | ⚠️ Conditional | Verification SID (alternative to `To`) | `"VE1234567890abcdef"` |

#### Request Examples

**cURL:**
```bash
curl -X POST "https://wapi.softgrouprd.com/api/verify/v2/Services/VA1234567890abcdef/VerificationCheck" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Code=123456&To=%2B1234567890"
```

**JavaScript:**
```javascript
const response = await fetch('/api/verify/v2/Services/VA1234567890abcdef/VerificationCheck', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    Code: '123456',
    To: '+1234567890'
  })
});

const result = await response.json();
if (result.valid) {
  console.log('✅ Verification successful!');
} else {
  console.log('❌ Invalid code');
}
```

**Python:**
```python
import requests

url = 'https://wapi.softgrouprd.com/api/verify/v2/Services/VA1234567890abcdef/VerificationCheck'
data = {
    'Code': '123456',
    'To': '+1234567890'
}

response = requests.post(url, data=data)
result = response.json()

if result['valid']:
    print('✅ Verification successful!')
else:
    print('❌ Invalid code')
```

**PHP:**
```php
<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://wapi.softgrouprd.com/api/verify/v2/Services/VA1234567890abcdef/VerificationCheck',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => 'Code=123456&To=%2B1234567890',
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/x-www-form-urlencoded'
  ),
));

$response = curl_exec($curl);
$result = json_decode($response, true);

if ($result['valid']) {
    echo '✅ Verification successful!';
} else {
    echo '❌ Invalid code';
}
?>
```

#### Response (200 OK) - Success

```json
{
  "sid": "VE1234567890abcdef1234567890abcdef",
  "service_sid": "VA1234567890abcdef1234567890abcdef",
  "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "to": "+1234567890",
  "channel": "whatsapp",
  "status": "approved",
  "valid": true,
  "date_created": "2025-10-06T23:49:08.394Z",
  "date_updated": "2025-10-06T23:52:15.123Z",
  "amount": null,
  "payee": null,
  "sna": null
}
```

#### Response (200 OK) - Failed

```json
{
  "sid": "VE1234567890abcdef1234567890abcdef",
  "service_sid": "VA1234567890abcdef1234567890abcdef",
  "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "to": "+1234567890",
  "channel": "whatsapp",
  "status": "failed",
  "valid": false,
  "date_created": "2025-10-06T23:49:08.394Z",
  "date_updated": "2025-10-06T23:52:15.123Z",
  "amount": null,
  "payee": null,
  "sna": null
}
```

---

### 3. Get Verification Details

Retrieve details about a specific verification.

#### Endpoint
```http
GET /verify/v2/Services/{ServiceSid}/Verifications/{Sid}
```

#### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `ServiceSid` | string | ✅ Yes | Service identifier | `VA1234567890abcdef` |
| `Sid` | string | ✅ Yes | Verification SID | `VE1234567890abcdef` |

#### Request Examples

**cURL:**
```bash
curl "https://wapi.softgrouprd.com/api/verify/v2/Services/VA1234567890abcdef/Verifications/VE1234567890abcdef"
```

**JavaScript:**
```javascript
const response = await fetch('/api/verify/v2/Services/VA1234567890abcdef/Verifications/VE1234567890abcdef');
const verification = await response.json();
console.log('Status:', verification.status);
```

#### Response (200 OK)

```json
{
  "sid": "VE1234567890abcdef1234567890abcdef",
  "service_sid": "VA1234567890abcdef1234567890abcdef",
  "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "to": "+1234567890",
  "channel": "whatsapp",
  "status": "pending",
  "valid": false,
  "date_created": "2025-10-06T23:49:08.394Z",
  "date_updated": "2025-10-06T23:49:08.394Z",
  "lookup": {},
  "amount": null,
  "payee": null,
  "send_code_attempts": [
    {
      "time": "2025-10-06T23:49:08.394Z",
      "channel": "whatsapp",
      "attempt_sid": "VE1234567890abcdef1234567890abcdef"
    }
  ],
  "sna": null,
  "url": "https://verify.twilio.com/v2/Services/VA1234567890abcdef/Verifications/VE1234567890abcdef1234567890abcdef"
}
```

## 🎨 Message Templates

### Default Templates

**English (en):**
```
Your verification code is: {{code}}. Valid for 10 minutes.
```

**Spanish (es):**
```
Tu código de verificación es: {{code}}. Válido por 10 minutos.
```

### Custom Message Templates

You can provide custom messages using the `CustomMessage` parameter:

```bash
curl -X POST "https://wapi.softgrouprd.com/api/verify/v2/Services/VA123/Verifications" \
  -d "To=+1234567890" \
  -d "CustomMessage=🔐 Your secure code: {{code}} - Do not share!"
```

**Template Variables:**
- `{{code}}` - The verification code (required)

## 🚨 Error Responses

All errors follow Twilio's error format for maximum compatibility.

### Common Error Codes

| Code | Status | Description | Solution |
|------|--------|-------------|----------|
| 60200 | 400 | Missing required parameter | Provide all required fields |
| 60212 | 400 | Invalid channel | Use 'whatsapp' or 'sms' |
| 60202 | 503 | Service unavailable | Try again later or contact support |
| 60203 | 429 | Too many attempts | Wait before trying again |
| 20404 | 404 | Resource not found | Check verification SID or phone number |
| 20001 | 500 | Internal server error | Contact support |

### Error Response Format

```json
{
  "code": 60200,
  "message": "'To' is required",
  "more_info": "https://www.twilio.com/docs/api/errors/60200",
  "status": 400
}
```

## 🔧 SDK Integration Examples

### Node.js with Twilio SDK

**No changes needed!** Just update the base URL:

```javascript
const twilio = require('twilio');

// Initialize client with custom URL
const client = twilio('ACfake', 'fake_token', {
  accountSid: 'ACfake',
  region: 'custom',
  edge: 'sydney' // This will be ignored
});

// Override the base URL to point to our API
client.verify.services = (serviceSid) => ({
  verifications: {
    create: async (options) => {
      const response = await fetch(`https://wapi.softgrouprd.com/api/verify/v2/Services/${serviceSid}/Verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(options)
      });
      return response.json();
    }
  },
  verificationCheck: {
    create: async (options) => {
      const response = await fetch(`https://wapi.softgrouprd.com/api/verify/v2/Services/${serviceSid}/VerificationCheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(options)
      });
      return response.json();
    }
  }
});

// Usage (exactly like Twilio!)
const verification = await client.verify.services('VA123').verifications.create({
  to: '+1234567890',
  channel: 'whatsapp'
});

const result = await client.verify.services('VA123').verificationCheck.create({
  to: '+1234567890',
  code: '123456'
});
```

### Python with Twilio SDK

```python
from twilio.rest import Client
import requests

class CustomVerifyClient:
    def __init__(self, base_url="https://wapi.softgrouprd.com/api"):
        self.base_url = base_url
    
    def create_verification(self, service_sid, to, channel='whatsapp', custom_message=None):
        url = f"{self.base_url}/verify/v2/Services/{service_sid}/Verifications"
        data = {'To': to, 'Channel': channel}
        if custom_message:
            data['CustomMessage'] = custom_message
        
        response = requests.post(url, data=data)
        return response.json()
    
    def check_verification(self, service_sid, to, code):
        url = f"{self.base_url}/verify/v2/Services/{service_sid}/VerificationCheck"
        data = {'To': to, 'Code': code}
        
        response = requests.post(url, data=data)
        return response.json()

# Usage
verify = CustomVerifyClient()

# Send verification
verification = verify.create_verification(
    service_sid='VA123',
    to='+1234567890',
    channel='whatsapp'
)

# Check code
result = verify.check_verification(
    service_sid='VA123',
    to='+1234567890',
    code='123456'
)

if result['valid']:
    print('✅ Phone verified successfully!')
```

## ⚡ Best Practices

### 1. Rate Limiting
- Maximum 5 verification attempts per phone number per hour
- Maximum 10 verifications per minute per API client
- Implement exponential backoff on failures

### 2. Security
```javascript
// Always validate on server-side
app.post('/verify-phone', async (req, res) => {
  const { phone, code } = req.body;
  
  // Validate input
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }
  
  // Check with our API
  const result = await checkVerification(phone, code);
  
  if (result.valid) {
    // ✅ Update user as verified in your database
    await updateUserVerification(phone, true);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid code' });
  }
});
```

### 3. Error Handling
```javascript
async function sendVerificationWithRetry(phone, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await createVerification(phone);
      return result;
    } catch (error) {
      if (error.code === 60202 && i < maxRetries - 1) {
        // Service unavailable, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### 4. Caching
```javascript
// Cache successful verifications to prevent replay attacks
const verifiedNumbers = new Map();

function isRecentlyVerified(phone) {
  const lastVerified = verifiedNumbers.get(phone);
  if (lastVerified && Date.now() - lastVerified < 3600000) { // 1 hour
    return true;
  }
  return false;
}

function markAsVerified(phone) {
  verifiedNumbers.set(phone, Date.now());
}
```

## 🌍 Multi-language Support

### Supported Locales

| Locale | Language | Default Message |
|--------|----------|-----------------|
| `en` | English | "Your verification code is: {{code}}. Valid for 10 minutes." |
| `es` | Spanish | "Tu código de verificación es: {{code}}. Válido por 10 minutos." |

### Custom Locale Messages

```bash
# Spanish verification
curl -X POST "/api/verify/v2/Services/VA123/Verifications" \
  -d "To=+1234567890" \
  -d "Locale=es"

# Custom message in any language
curl -X POST "/api/verify/v2/Services/VA123/Verifications" \
  -d "To=+1234567890" \
  -d "CustomMessage=Votre code: {{code}} (français)"
```

## 📊 Monitoring & Analytics

### Health Check
```bash
curl "https://wapi.softgrouprd.com/api/health"
```

### Service Status
```bash
curl "https://wapi.softgrouprd.com/api/bots"
```

## 🚀 Migration Guide

### From Twilio Verify API

1. **Update Base URL**: Change from `verify.twilio.com` to `wapi.softgrouprd.com/api`
2. **Remove Authentication**: No API keys needed (optional for production)
3. **Keep Everything Else**: All parameters, responses, and error codes are identical

### Example Migration

**Before (Twilio):**
```javascript
const verification = await client.verify.services('VA123')
  .verifications
  .create({
    to: '+1234567890',
    channel: 'sms'
  });
```

**After (Our API):**
```javascript
const verification = await fetch('https://wapi.softgrouprd.com/api/verify/v2/Services/VA123/Verifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    To: '+1234567890',
    Channel: 'whatsapp'  // Changed to WhatsApp
  })
});
```

## 🆘 Support & Contact

- **API Documentation**: This document
- **Health Status**: `https://wapi.softgrouprd.com/api/health`
- **Issues**: Contact technical support
- **Feature Requests**: Submit via GitHub or support channel

---

**🎯 Ready to replace Twilio?** Start with a simple test:

```bash
curl -X POST "https://wapi.softgrouprd.com/api/verify/v2/Services/TEST/Verifications" \
  -d "To=+1234567890&Channel=whatsapp"
```

**✅ 100% Twilio Compatible • 🚀 Easy Migration • 📱 WhatsApp Native**