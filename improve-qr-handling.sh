#!/bin/bash

# IMPROVED VERSION of the fix-qr-endpoint.sh script
# This script updates the QR code handling to use PM2 metrics instead of HTTP POST

echo "🚀 Starting QR code endpoint improvement..."

# Check if we're in the project root
if [ ! -d "./bot" ]; then
  echo "❌ Error: This script must be run from the bot-manager project root"
  exit 1
fi

# Build the bot
echo "📦 Building the bot with improved QR code handling..."
cd ./bot
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Error building the bot"
  exit 1
fi
echo "✅ Bot built successfully"

# Restart just the bot services with PM2
echo "🔄 Restarting bot services with PM2..."
if command -v pm2 &> /dev/null; then
    echo "📊 PM2 is installed, restarting bot services..."
    cd ..
    # Get the running bot services
    BOT_SERVICES=$(pm2 list | grep wabot | awk '{print $2}')
    
    if [ -z "$BOT_SERVICES" ]; then
      echo "⚠️ No bot services found running in PM2"
    else
      echo "📝 Found bot services: $BOT_SERVICES"
      # Reload each bot service
      for service in $BOT_SERVICES; do
        echo "🔄 Reloading service: $service"
        pm2 reload $service
      done
    fi
    
    # Show the running services
    pm2 list
else
    echo "❌ PM2 is not installed. Please restart the services manually."
fi

echo "✅ Bot rebuild and restart completed! QR code handling improved."
echo ""
echo "🔍 QR Code Improvements:"
echo "1. QR codes are now stored locally instead of being POSTed to the backend"
echo "2. Bot metrics are updated via PM2 for better monitoring"
echo "3. Frontend can request QR codes on-demand for better performance"
echo "4. Improved error handling for QR code generation and storage"
