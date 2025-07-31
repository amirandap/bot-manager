# 📎 WhatsApp Bot Media Attachments API

## Overview

The WhatsApp Bot Manager now supports sending different types of media attachments through dedicated endpoints. The system automatically routes requests based on file type and supports various media formats.

## 🚀 Quick Start

### Basic Text Message
```bash
curl -X POST http://localhost:3001/api/bots/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "your-bot-id",
    "to": ["+1234567890"],
    "message": "Hello World!"
  }'
```

### Image with Caption
```bash
curl -X POST http://localhost:3001/api/bots/send-message \
  -F "botId=your-bot-id" \
  -F "to=+1234567890" \
  -F "message=Check out this image!" \
  -F "file=@/path/to/image.jpg"
```

### Document
```bash
curl -X POST http://localhost:3001/api/bots/send-message \
  -F "botId=your-bot-id" \
  -F "to=+1234567890" \
  -F "message=Here's the document you requested" \
  -F "file=@/path/to/document.pdf"
```

### Video with Caption
```bash
curl -X POST http://localhost:3001/api/bots/send-message \
  -F "botId=your-bot-id" \
  -F "to=+1234567890" \
  -F "message=Check out this video!" \
  -F "file=@/path/to/video.mp4"
```

### Audio Message
```bash
curl -X POST http://localhost:3001/api/bots/send-message \
  -F "botId=your-bot-id" \
  -F "to=+1234567890" \
  -F "message=Voice message for you" \
  -F "file=@/path/to/audio.mp3"
```

## 📋 Supported File Types

### 🖼️ Images
- **Endpoint**: `/send-image`
- **Max Size**: 16MB
- **Formats**: JPEG, PNG, GIF, WebP
- **Caption**: Supported via `message` field

### 📄 Documents  
- **Endpoint**: `/send-document`
- **Max Size**: 100MB
- **Formats**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP, RAR, 7Z
- **Message**: Optional accompanying message

### 🎵 Audio
- **Endpoint**: `/send-audio`
- **Max Size**: 16MB
- **Formats**: MP3, WAV, OGG, M4A, AAC, OPUS
- **Message**: Optional accompanying message
- **Voice Notes**: OGG/OPUS files are automatically sent as voice messages

### 🎬 Video
- **Endpoint**: `/send-video`
- **Max Size**: 64MB
- **Formats**: MP4, AVI, MOV, WMV, FLV, WebM, MKV
- **Caption**: Supported via `message` field

## 🎯 Automatic Routing

The `/send-message` endpoint automatically detects file attachments and routes to the appropriate specialized endpoint:

```
File Type Detection:
├── image/* → /send-image
├── video/* → /send-video  
├── audio/* → /send-audio
└── everything else → /send-document
```

## 📤 Request Format

### With File Attachment (multipart/form-data)
```javascript
const formData = new FormData();
formData.append('botId', 'your-bot-id');
formData.append('to', '+1234567890');
formData.append('message', 'Caption or message text');
formData.append('file', fileInput.files[0]);

fetch('/api/bots/send-message', {
  method: 'POST',
  body: formData
});
```

### Without File (application/json)
```javascript
fetch('/api/bots/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    botId: 'your-bot-id',
    to: ['+1234567890'],
    message: 'Text only message'
  })
});
```

## 📬 Recipients

You can send to multiple recipients and mix phone numbers with groups:

```javascript
{
  "botId": "your-bot-id",
  "to": [
    "+1234567890",           // Phone number
    "+18298870174",          // Another phone number  
    "group123@g.us"          // WhatsApp group
  ],
  "message": "Message for everyone!"
}
```

## 📋 Response Format

### Success Response
```json
{
  "success": true,
  "result": {
    "messagesSent": ["+1234567890@c.us"],
    "errors": [],
    "totalSent": 1,
    "totalErrors": 0,
    "fileInfo": {
      "name": "image.jpg",
      "size": 245760,
      "type": "image/jpeg"
    }
  },
  "messageType": "IMAGE_ATTACHMENT",
  "endpoint": "/send-image",
  "requestId": 1627849260123,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Failed to send message",
  "errorType": "BOT_ERROR",
  "details": "Bot API returned 400 - Invalid file format",
  "requestId": 1627849260123,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "troubleshooting": "Check bot logs and WhatsApp session status"
}
```

## 🔧 Error Types

- **VALIDATION_ERROR**: Invalid request parameters
- **BACKEND_ERROR**: Bot configuration issues
- **BOT_ERROR**: Bot API errors
- **CONNECTION_ERROR**: Cannot connect to bot
- **REQUEST_SETUP_ERROR**: Request format issues

## 🎨 Frontend Integration

### HTML Form Example
```html
<form id="messageForm" enctype="multipart/form-data">
  <input type="hidden" name="botId" value="your-bot-id">
  <input type="text" name="to" placeholder="+1234567890" required>
  <textarea name="message" placeholder="Your message..."></textarea>
  <input type="file" name="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx">
  <button type="submit">Send Message</button>
</form>

<script>
document.getElementById('messageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    const response = await fetch('/api/bots/send-message', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Message sent:', result);
  } catch (error) {
    console.error('Error:', error);
  }
});
</script>
```

### React Component Example
```jsx
import { useState } from 'react';

function MessageSender() {
  const [formData, setFormData] = useState({
    botId: 'your-bot-id',
    to: '',
    message: '',
    file: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) data.append(key, formData[key]);
    });

    try {
      const response = await fetch('/api/bots/send-message', {
        method: 'POST',
        body: data
      });
      
      const result = await response.json();
      console.log('Success:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        placeholder="Phone number" 
        value={formData.to}
        onChange={(e) => setFormData({...formData, to: e.target.value})}
        required 
      />
      <textarea 
        placeholder="Message..."
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
      />
      <input 
        type="file" 
        onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
      />
      <button type="submit">Send Message</button>
    </form>
  );
}
```

## 🔍 Testing

Test different file types:
```bash
# Test image
curl -X POST http://localhost:3001/api/bots/send-message \
  -F "botId=your-bot-id" \
  -F "to=+1234567890" \
  -F "message=Test image" \
  -F "file=@test.jpg"

# Test PDF
curl -X POST http://localhost:3001/api/bots/send-message \
  -F "botId=your-bot-id" \
  -F "to=+1234567890" \
  -F "message=Test document" \
  -F "file=@test.pdf"

# Test audio  
curl -X POST http://localhost:3001/api/bots/send-message \
  -F "botId=your-bot-id" \
  -F "to=+1234567890" \
  -F "file=@test.mp3"
```
