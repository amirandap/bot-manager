#!/bin/bash

# Bot Manager Setup Script for Ubuntu Server
echo "🤖 Setting up Bot Manager..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
    echo "✅ PM2 installed: $(pm2 --version)"
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p config
mkdir -p data/sessions
mkdir -p data/qr-codes  
mkdir -p data/logs

echo "✅ Directory structure created:"
echo "├── config/           # Central configuration"
echo "├── data/"
echo "│   ├── sessions/     # Bot sessions by ID"
echo "│   ├── qr-codes/     # QR codes by ID"
echo "│   └── logs/         # Logs by ID" 
echo "├── bot/              # Single bot binary (shared)"
echo "├── backend/          # API server"
echo "└── frontend/         # Dashboard"

# Root environment is gitignored. Start from the placeholder template.
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example — fill in local values, do not commit it"
    else
        echo "⚠️  .env.example not found. Create a root .env before starting the app."
    fi
else
    echo "ℹ️  Root .env already exists"
fi

# Setup bot directory
echo "🤖 Setting up bot dependencies..."
if [ -d "bot" ] && [ -f "bot/package.json" ]; then
    cd bot
    if [ ! -f .env ] && [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created bot/.env from bot/.env.example"
    fi
    npm install
    echo "✅ Bot dependencies installed"
    cd ..
else
    echo "⚠️  Bot directory not found. Creating minimal bot setup..."
    mkdir -p bot
    # We'll let the spawner service handle creating the actual bot files
fi

# Setup backend
echo "📝 Setting up backend environment..."
cd backend
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created backend .env file from example"
    else
        # Create basic .env file
        cat > .env << EOF
PORT=3001
FALLBACK_API_HOST=http://localhost
NODE_ENV=development
EOF
        echo "✅ Created basic backend .env file"
    fi
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

# Create initial bots.json if it doesn't exist
if [ ! -f "config/bots.json" ]; then
    echo "📝 Creating initial bots.json configuration..."
    cat > config/bots.json << 'EOF'
{
  "bots": []
}
EOF
    echo "✅ Created empty bots.json configuration"
else
    echo "ℹ️  config/bots.json already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📊 System Status:"
echo "• Node.js: $(node --version)"
echo "• NPM: $(npm --version)"
echo "• PM2: $(pm2 --version)"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend: cd backend && npm start"
echo "2. Start the frontend: cd frontend && npm run dev"
echo "3. Create your first bot via API:"
echo ""
echo "   curl -X POST http://localhost:3001/api/bots/spawn/whatsapp \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{"
echo "       \"name\": \"My First Bot\","
echo "       \"type\": \"whatsapp\","
echo "       \"apiHost\": \"http://localhost\","
echo "       \"apiPort\": 7260,"
echo "       \"enabled\": true"
echo "     }'"
echo ""
echo "🤖 Bot Management Commands:"
echo "• pm2 list                          # Show all running bots"
echo "• pm2 logs <bot-id>                 # Show logs for specific bot"
echo "• pm2 monit                         # PM2 monitoring dashboard"
echo "• pm2 stop <bot-id>                 # Stop specific bot"
echo "• pm2 restart <bot-id>              # Restart specific bot"
echo ""
echo "🌐 API Endpoints:"
echo "• POST /api/bots/spawn/whatsapp     # Create and start new WhatsApp bot"
echo "• GET  /api/bots                    # List all bots"
echo "• POST /api/bots/:id/start          # Start existing bot"
echo "• POST /api/bots/:id/stop           # Stop existing bot"
echo "• POST /api/bots/:id/restart        # Restart existing bot"
echo "• DELETE /api/bots/:id/terminate    # Completely remove bot"
echo ""
echo "📱 Access URLs:"
echo "• Backend API: http://localhost:3001"
echo "• Frontend Dashboard: http://localhost:7261"
echo "• Bot APIs: http://localhost:7260+ (assigned automatically)"
echo ""
echo "📄 Configuration:"
echo "• Bot config: config/bots.json (auto-updated)"
echo "• Backend env: backend/.env"
echo "• Bot data: data/ (sessions, qr-codes, logs)"
