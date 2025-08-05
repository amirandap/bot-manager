#!/bin/bash

# Script to build and restart just the bot service with QR code endpoint fix
# This script should be run from the project root

echo "🚀 Starting bot rebuild with QR code endpoint fix..."

# Check if we're in the project root
if [ ! -d "./bot" ]; then
  echo "❌ Error: This script must be run from the bot-manager project root"
  exit 1
fi

# Build the bot
echo "📦 Building the bot with QR code endpoint fix..."
cd ./bot
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Error building the bot"
  exit 1
fi
echo "✅ Bot built successfully"

# Restart just the bot services with PM2
echo "🔄 Attempting to restart bot services with PM2..."
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

echo "✅ Bot rebuild and restart completed! QR code endpoint fix applied."
echo ""
echo "🔍 Testing instructions:"
echo "1. Check the bot logs to verify QR code generation and posting"
echo "2. Try to scan a QR code with a WhatsApp device"
echo "3. Verify that the lifecycle states are correctly tracked"
