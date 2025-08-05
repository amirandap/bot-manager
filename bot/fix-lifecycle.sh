#!/bin/bash

echo "Building bot with new lifecycle tracker..."

# Fix imports if there are any issues
sed -i 's/const { botLifecycle, BotLifecycleState } = require/const lifecycleTracker = require/g' ./src/config/whatsAppClient.ts

# Try building
npm run build

echo "Build completed. Check for any errors above."
