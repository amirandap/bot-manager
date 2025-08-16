# Copilot Instructions for Bot Manager

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a WhatsApp/Discord bot manager built with TypeScript, featuring:

- **Backend**: Node.js with Express API (Port 3001)
- **Frontend**: Next.js 15 with App Router (Port 7261)
- **Architecture**: Monorepo with auto-sync capabilities

## Key Principles

- Use TypeScript with strict type checking
- Follow the existing project structure and patterns
- Maintain consistency with the singleton ConfigService pattern
- Use proper error handling and logging
- Follow the auto-sync architecture for real-time bot monitoring

## Technology Stack

- **Backend**: Node.js, Express, TypeScript, ts-node
- **Frontend**: Next.js 15, React, Tailwind CSS, shadcn/ui
- **Bot Integration**: WhatsApp Web API, Discord.js
- **Utilities**: Concurrently for dev scripts, Axios for HTTP requests

## Code Style Guidelines

- Use consistent naming: camelCase for variables/functions, PascalCase for classes/types
- Prefer async/await over promises
- Use proper TypeScript interfaces and types
- Follow the existing service-based architecture
- Use the established error handling patterns
- **NEVER create or use .sh scripts** - always execute commands directly in terminal
- Use direct npm/pm2/git commands instead of shell scripts
- Prefer built-in VS Code terminal over custom automation scripts

## Terminal Management

**IMPORTANT: Always use two separate terminals:**

1. **Development Terminal** (Terminal 1): For running the development servers

   - Use for: `npm run dev`, `pm2 start`, `pm2 restart`, long-running processes
   - Keep this terminal dedicated to running services
   - Don't interrupt this terminal for other commands

2. **Testing Terminal** (Terminal 2): For running tests, API calls, and debugging
   - Use for: `curl`, `jq`, `pm2 status`, `pm2 logs`, file operations
   - Use for all testing and debugging commands
   - This terminal should be free to run quick commands

**Never run testing commands in the same terminal that's running development servers**

## API Structure

- All backend routes follow REST conventions
- Use proper HTTP status codes
- Maintain the bot configuration in `config/bots.json`
- Follow the auto-sync pattern for real-time data updates

## Bot Management Features

- Multi-instance bot support
- Real-time status monitoring
- QR code generation for WhatsApp bots
- Configuration hot-reload
- Direct API communication with bot instances

## Build and Deploy Commands

**IMPORTANT: Never use custom .sh scripts. Always use direct commands.**

Instead of using helper scripts, prefer using these direct commands:

### Building components

```bash
# Build the bot component
cd bot && npm run build

# Build the frontend component
cd frontend && npm run build

# Build the backend component
cd backend && npm run build
```

### Restarting services

```bash
# Restart a specific bot instance
pm2 reload wabot-[port]

# Restart the backend
pm2 reload bot-manager-backend

# Restart the frontend
pm2 reload bot-manager-frontend

# Restart all services
pm2 reload all
```

### Development workflow

```bash
# Start development servers (Terminal 1)
npm run dev

# Check logs (Terminal 2)
pm2 logs bot-manager-backend
pm2 logs wabot-[port]

# Monitor services (Terminal 2)
pm2 monit

# Test API endpoints (Terminal 2)
curl -s "http://localhost:3001/api/bots" | jq
curl -s "http://localhost:3001/api/status/bot-id" | jq
```

When suggesting code changes, ensure they:

1. Maintain the existing architecture patterns
2. Follow TypeScript best practices
3. Are compatible with the monorepo structure
4. Support the auto-sync functionality
5. Handle errors gracefully
6. **NEVER use custom .sh scripts - always prefer direct terminal commands**
7. Use npm/pm2/git commands directly instead of wrapper scripts
8. **Always use separate terminals for development servers vs testing commands**
