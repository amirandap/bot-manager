# Environment Configuration Setup

## Overview

The project now has a clean, simplified environment configuration with only the necessary files.

## Environment Files Structure

### Root Directory

- **`.env.example`** - Committed template (names and placeholders only)
- **`.env`** - Local development environment (gitignored; copy from `.env.example`)
- **`.env.production`** - Local production environment (gitignored; copy from `.env.example`)

### Bot Directory (unchanged)

- **`bot/.env`** - Bot-specific environment variables
- **`bot/.env.example`** - Bot environment template

## Usage

Create local env files from the templates. Do not commit them.

```bash
cp .env.example .env
cp bot/.env.example bot/.env
```

### Development

When you run `npm run dev`, the system automatically loads `.env` from the root directory.

- Backend loads the repository root `.env`
- Frontend (Next.js) loads env files from `frontend/` when started with `npm run dev`

### Production

When you deploy with PM2 using `ecosystem.config.js`, it loads `.env.production`.

- Both backend and frontend PM2 configs reference `.env.production`

## Key Features

1. **Centralized Configuration**: All environment variables are loaded from the root directory
2. **No Duplication**: Removed redundant `.env` files from backend/ and frontend/ directories
3. **Clear Separation**: Development vs Production configurations
4. **PM2 Integration**: Production environment automatically loaded by PM2

## Environment Variables

### Development (`.env`)

- Uses `localhost` for all services
- Debug logging enabled
- Development features enabled
- Ports: Backend (3001), Frontend (7261), Bots (7260+)

### Production (`.env.production`)

- Uses domain/IP placeholders (needs customization)
- Info-level logging
- Production optimizations
- HTTPS URLs (needs SSL setup)

## Git Tracking

✅ **Tracked Files** (committed to git):

- `.env.example` (placeholders only)
- `bot/.env.example` (placeholders only)

❌ **Ignored Files** (not committed):

- `.env`
- `.env.production`
- `.env.development`
- `.env.dev`
- `.env.local`
- `.env.*` except `*.example`
- `*.env`
- Private keys (`*.pem`, `*.key`, `id_rsa`, …) and credential JSON files

## Important Notes

1. **Production Setup**: Update `.env.production` with your actual domain/IP before deploying
2. **No Localhost Fallbacks**: All environment variables must be explicitly set
3. **Security**: Sensitive variables (JWT secrets, API keys) should be added to production env
4. **Bot Instances**: Each bot can still have its own `.env` in the `bot/` directory for bot-specific configs
