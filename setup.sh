#!/bin/bash

# Bot Manager Setup Script
echo "🤖 Setting up Bot Manager..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Create config directory if it doesn't exist
echo "📁 Creating configuration directory..."
mkdir -p config

# Copy example environment file for backend
echo "📝 Setting up backend environment..."
cd backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created backend .env file from example"
else
    echo "ℹ️  Backend .env file already exists"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Build backend
echo "🔨 Building backend..."
npm run build

cd ..

# Setup frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update config/bots.json with your bot configurations"
echo "2. Update backend/.env with your environment variables"
echo "3. Start the backend: cd backend && npm start"
echo "4. Start the frontend: cd frontend && npm run dev"
echo ""
echo "📖 API Documentation:"
echo "• GET /api/bots - List all bots"
echo "• POST /api/bots - Create a new bot"
echo "• PUT /api/bots/:id - Update a bot"
echo "• DELETE /api/bots/:id - Delete a bot"
echo "• GET /api/status/discord - Discord bot statuses"
echo "• GET /api/status/whatsapp - WhatsApp bot statuses"
echo "• GET /api/status/:id - Individual bot status"
