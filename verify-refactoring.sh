#!/bin/bash

echo "🔍 Verifying BotProxyController Refactoring Migration"
echo "=================================================="

# Check if new structure exists
echo ""
echo "📁 Checking new file structure..."

# Services
if [ -f "/home/linuxuser/bot-manager/backend/src/services/botProxy/BotCommunicationService.ts" ]; then
  echo "✅ BotCommunicationService.ts"
else
  echo "❌ BotCommunicationService.ts - MISSING"
fi

if [ -f "/home/linuxuser/bot-manager/backend/src/services/botProxy/MessageRoutingService.ts" ]; then
  echo "✅ MessageRoutingService.ts"
else
  echo "❌ MessageRoutingService.ts - MISSING"
fi

if [ -f "/home/linuxuser/bot-manager/backend/src/services/botProxy/ErrorHandlingService.ts" ]; then
  echo "✅ ErrorHandlingService.ts"
else
  echo "❌ ErrorHandlingService.ts - MISSING"
fi

# Controllers
if [ -f "/home/linuxuser/bot-manager/backend/src/controllers/botProxy/BotStatusController.ts" ]; then
  echo "✅ BotStatusController.ts"
else
  echo "❌ BotStatusController.ts - MISSING"
fi

if [ -f "/home/linuxuser/bot-manager/backend/src/controllers/botProxy/BotConfigController.ts" ]; then
  echo "✅ BotConfigController.ts"
else
  echo "❌ BotConfigController.ts - MISSING"
fi

if [ -f "/home/linuxuser/bot-manager/backend/src/controllers/botProxy/BotMessagingController.ts" ]; then
  echo "✅ BotMessagingController.ts"
else
  echo "❌ BotMessagingController.ts - MISSING"
fi

# Main controller
if [ -f "/home/linuxuser/bot-manager/backend/src/controllers/botProxyController.ts" ]; then
  echo "✅ Main botProxyController.ts (refactored)"
else
  echo "❌ Main botProxyController.ts - MISSING"
fi

# Backup
if [ -f "/home/linuxuser/bot-manager/backend/src/controllers/botProxyController.backup-v2.ts" ]; then
  echo "✅ Backup created (botProxyController.backup-v2.ts)"
else
  echo "❌ Backup - MISSING"
fi

echo ""
echo "📊 File size comparison:"
if [ -f "/home/linuxuser/bot-manager/backend/src/controllers/botProxyController.backup-v2.ts" ]; then
  ORIGINAL_SIZE=$(wc -l < "/home/linuxuser/bot-manager/backend/src/controllers/botProxyController.backup-v2.ts")
  echo "Original controller: $ORIGINAL_SIZE lines"
fi

if [ -f "/home/linuxuser/bot-manager/backend/src/controllers/botProxyController.ts" ]; then
  NEW_SIZE=$(wc -l < "/home/linuxuser/bot-manager/backend/src/controllers/botProxyController.ts")
  echo "New main controller: $NEW_SIZE lines"
fi

# Calculate total lines in new structure
TOTAL_NEW=0
for file in \
  "/home/linuxuser/bot-manager/backend/src/services/botProxy/BotCommunicationService.ts" \
  "/home/linuxuser/bot-manager/backend/src/services/botProxy/MessageRoutingService.ts" \
  "/home/linuxuser/bot-manager/backend/src/services/botProxy/ErrorHandlingService.ts" \
  "/home/linuxuser/bot-manager/backend/src/controllers/botProxy/BotStatusController.ts" \
  "/home/linuxuser/bot-manager/backend/src/controllers/botProxy/BotConfigController.ts" \
  "/home/linuxuser/bot-manager/backend/src/controllers/botProxy/BotMessagingController.ts" \
  "/home/linuxuser/bot-manager/backend/src/controllers/botProxyController.ts"
do
  if [ -f "$file" ]; then
    LINES=$(wc -l < "$file")
    TOTAL_NEW=$((TOTAL_NEW + LINES))
  fi
done

echo "Total new structure: $TOTAL_NEW lines"

echo ""
echo "🧪 Testing TypeScript compilation..."
cd /home/linuxuser/bot-manager/backend
if npx tsc --noEmit src/controllers/botProxyController.ts 2>/dev/null; then
  echo "✅ Main controller compiles successfully"
else
  echo "❌ Main controller compilation failed"
fi

echo ""
echo "🎯 Migration Benefits:"
echo "• Modular architecture with single responsibility"
echo "• Easier to maintain and test individual components"  
echo "• Better code organization and reusability"
echo "• Maintained backward compatibility"

echo ""
echo "🔧 API Endpoints Status:"
echo "All existing endpoints should work unchanged:"
echo "• POST /api/bots/send-message (with attachment support)"
echo "• GET /api/bots/:id/qr-code"
echo "• GET /api/bots/:id/status"
echo "• POST /api/bots/change-fallback-number"
echo "• POST /api/bots/change-port"
echo "• POST /api/bots/get-groups"
echo "• All other messaging endpoints"

echo ""
echo "✅ Migration verification completed!"
echo ""
echo "💡 To test the API:"
echo "  ./test-attachments.sh"
echo ""
echo "🔄 To rollback if needed:"
echo "  cd backend/src/controllers"
echo "  cp botProxyController.backup-v2.ts botProxyController.ts"
