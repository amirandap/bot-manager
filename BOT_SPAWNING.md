# Bot Spawning Feature

## Overview

The bot spawning feature allows you to create and start new WhatsApp bot instances directly from the frontend dashboard. Each spawned bot runs as a separate PM2 process with its own configuration.

## How It Works

### 1. Frontend Component (`BotSpawner`)

- Provides a user-friendly form to configure new bot instances
- Validates input fields and generates random ports
- Sends spawn requests to the backend API
- Updates the dashboard when new bots are created

### 2. Backend API (`/api/bots/spawn/whatsapp`)

- Receives bot configuration from frontend
- Uses `BotSpawnerService` to create and start the bot
- Automatically adds the bot to `config/bots.json`

### 3. Bot Spawning Process

1. **Validation**: Checks that bot directory and dependencies exist
2. **Directory Creation**: Creates data directories for sessions, QR codes, and logs
3. **PM2 Launch**: Starts the bot with PM2 using environment configuration
4. **Config Update**: Adds the new bot to the central configuration file

## Environment Variable Handling

### Priority Order (highest to lowest):

1. **Bot-specific overrides** (from spawn form)
   - `BOT_ID`, `BOT_NAME`, `BOT_PORT`, `BOT_TYPE`, `BASE_URL`, `PORT`
2. **System environment** (from root `.env`)
3. **Bot folder defaults** (from `bot/.env`)

### Key Environment Variables:

```bash
# From bot/.env (defaults)
FALLBACKNUMBER=18295600987
CHROME_PATH=/usr/bin/google-chrome
GMAIL_USER=your-email@gmail.com

# Generated per bot instance
BOT_ID=whatsapp-bot-1234567890
BOT_NAME=My WhatsApp Bot
BOT_PORT=7262
BOT_TYPE=whatsapp
BASE_URL=http://localhost:7262
PORT=7262
```

## File Structure Created

When a new bot is spawned, the following directories are created:

```
data/
├── sessions/
│   └── whatsapp-bot-1234567890/     # WhatsApp session data
├── qr-codes/                        # QR code images
└── logs/
    └── whatsapp-bot-1234567890/     # Bot-specific logs
```

## API Endpoints

### Spawn WhatsApp Bot

```http
POST /api/bots/spawn/whatsapp
Content-Type: application/json

{
  "name": "My Bot",
  "apiPort": 7262,
  "apiHost": "http://localhost",
  "phoneNumber": "+1234567890",
  "pushName": "Bot Name"
}
```

### Terminate Bot

```http
DELETE /api/bots/{botId}/terminate
```

## Usage

### From Frontend Dashboard:

1. Click "Spawn New Bot" button
2. Fill in the bot configuration form
3. Click "🚀 Spawn WhatsApp Bot"
4. Wait for confirmation and return to dashboard

### From API directly:

```bash
curl -X POST http://localhost:3001/api/bots/spawn/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test Bot",
    "apiPort": 7262,
    "apiHost": "http://localhost"
  }'
```

## Configuration Integration

Spawned bots are automatically added to `config/bots.json`:

```json
{
  "bots": [
    {
      "id": "whatsapp-bot-1234567890",
      "name": "My Test Bot",
      "type": "whatsapp",
      "pm2ServiceId": "whatsapp-bot-1234567890",
      "apiHost": "http://localhost",
      "apiPort": 7262,
      "enabled": true,
      "createdAt": "2025-06-14T...",
      "updatedAt": "2025-06-14T..."
    }
  ]
}
```

## PM2 Management

Spawned bots run as PM2 processes and can be managed with standard PM2 commands:

```bash
# List all processes
pm2 list

# View logs for specific bot
pm2 logs whatsapp-bot-1234567890

# Restart bot
pm2 restart whatsapp-bot-1234567890

# Stop bot
pm2 stop whatsapp-bot-1234567890

# Delete bot process
pm2 delete whatsapp-bot-1234567890
```

## Features

- ✅ **Dynamic Port Assignment**: Generates random available ports
- ✅ **Environment Integration**: Uses bot folder .env as defaults
- ✅ **Automatic Configuration**: Updates config/bots.json automatically
- ✅ **PM2 Integration**: Starts as managed PM2 process
- ✅ **Data Management**: Creates organized directory structure
- ✅ **Real-time Updates**: Dashboard refreshes with new bot
- ✅ **Error Handling**: Comprehensive validation and error reporting
