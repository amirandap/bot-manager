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

When suggesting code changes, ensure they:

1. Maintain the existing architecture patterns
2. Follow TypeScript best practices
3. Are compatible with the monorepo structure
4. Support the auto-sync functionality
5. Handle errors gracefully
