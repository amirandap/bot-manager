# Development Guide

## Quick Start

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd bot-manager

# Run the setup script
./setup.sh

# Or manually install dependencies
npm run install:all
```

### 2. Environment Configuration

#### Shared Environment (.env)

```bash
# Copy the example file to create your environment configuration
cp .env.example .env
# Edit .env with your configuration
```

The project uses a single shared `.env` file at the root level that both backend and frontend consume. This makes configuration management much simpler in the monorepo structure.

### 3. Development Mode

```bash
# Start both backend and frontend in development mode
npm run dev

# Or start them separately
npm run dev:backend  # Backend on http://localhost:3001
npm run dev:frontend # Frontend on http://localhost:3000
```

## Project Structure

### Backend (`/backend`)

- `src/app.ts` - Main application entry point
- `src/controllers/` - Request handlers
- `src/services/` - Business logic and external integrations
- `src/routes/` - API route definitions
- `src/types/` - TypeScript type definitions
- `config/bots.json` - Bot configuration file

### Frontend (`/frontend`)

- `app/` - Next.js 15 app router pages
- `components/` - React components
- `lib/` - Utility functions and types
- `app/api/` - Frontend API routes (proxy to backend)

## Configuration

### Bot Configuration (`config/bots.json`)

```json
{
  "bots": [
    {
      "id": "unique-bot-id",
      "name": "Bot Display Name",
      "type": "whatsapp" | "discord",
      "pm2ServiceId": "pm2-process-name",
      "apiHost": "http://bot-api-host",
      "apiPort": 7260,
      "phoneNumber": "+1234567890", // WhatsApp only
      "pushName": "Bot Name", // WhatsApp only
      "enabled": true,
      "createdAt": "2025-06-11T00:00:00.000Z",
      "updatedAt": "2025-06-11T00:00:00.000Z"
    }
  ]
}
```

## API Endpoints

### Bots Management

- `GET /api/bots` - List all bots
- `POST /api/bots` - Create a new bot
- `GET /api/bots/:id` - Get bot by ID
- `PUT /api/bots/:id` - Update bot
- `DELETE /api/bots/:id` - Delete bot

### Bot Status

- `GET /api/status/discord` - Discord bot statuses
- `GET /api/status/whatsapp` - WhatsApp bot statuses
- `GET /api/status/:id` - Individual bot status

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Development mode
npm run dev

# Build for production
npm run build

# Start production servers
npm start

# Clean all build artifacts and dependencies
npm run clean
```

## Bot Integration

### WhatsApp Bots

- Bots should expose a `/status` endpoint returning connection status
- Bots should expose a `/send-message` endpoint for sending messages

### Discord Bots

- Bots should expose a `/health` endpoint for status checks
- Additional endpoints can be configured as needed

## Environment Variables

### Backend

- `PORT` - Backend server port (default: 3001)
- `FALLBACK_API_HOST` - Default host for bots with empty apiHost

### Frontend

- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL (default: http://localhost:3001)

## Troubleshooting

### Build Issues

1. Ensure Node.js 14+ is installed
2. Clear node_modules: `npm run clean && npm run install:all`
3. Check TypeScript errors: `npm run build`

### Runtime Issues

1. Verify environment variables are set
2. Check backend is running on correct port
3. Verify bot configuration in `config/bots.json`
4. Check browser network tab for API errors

## Contributing

1. Create a feature branch
2. Make changes with proper TypeScript types
3. Test both backend and frontend builds
4. Update documentation if needed
5. Submit a pull request
