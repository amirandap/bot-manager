#!/bin/bash

echo "🧪 Testing WhatsApp Bot Media Attachments API"
echo "=============================================="

# Backend URL
BACKEND_URL="http://localhost:3001"
BOT_ID="test-bot"
PHONE="+1234567890"

echo ""
echo "📝 1. Testing text-only message..."
curl -X POST "$BACKEND_URL/api/bots/send-message" \
  -H "Content-Type: application/json" \
  -d "{
    \"botId\": \"$BOT_ID\",
    \"to\": \"$PHONE\",
    \"message\": \"Hello from attachment test!\"
  }" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "📷 2. Testing with sample image (create a test file)..."
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAE9" | base64 -d > /tmp/test.png

curl -X POST "$BACKEND_URL/api/bots/send-message" \
  -F "botId=$BOT_ID" \
  -F "to=$PHONE" \
  -F "message=Test image attachment" \
  -F "file=@/tmp/test.png" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "📄 3. Testing with sample PDF..."
echo "%PDF-1.4 1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj" > /tmp/test.pdf

curl -X POST "$BACKEND_URL/api/bots/send-message" \
  -F "botId=$BOT_ID" \
  -F "to=$PHONE" \
  -F "message=Test PDF attachment" \
  -F "file=@/tmp/test.pdf" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "🔍 4. Testing bot status..."
curl -X GET "$BACKEND_URL/api/bots/$BOT_ID/status" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "✅ Testing completed!"
echo ""
echo "💡 Usage examples:"
echo "Text message:"
echo "  curl -X POST $BACKEND_URL/api/bots/send-message -H 'Content-Type: application/json' -d '{\"botId\":\"$BOT_ID\",\"to\":\"$PHONE\",\"message\":\"Hello!\"}'"
echo ""
echo "Image with caption:"
echo "  curl -X POST $BACKEND_URL/api/bots/send-message -F 'botId=$BOT_ID' -F 'to=$PHONE' -F 'message=Caption' -F 'file=@image.jpg'"
echo ""
echo "Document:"
echo "  curl -X POST $BACKEND_URL/api/bots/send-message -F 'botId=$BOT_ID' -F 'to=$PHONE' -F 'file=@document.pdf'"

# Cleanup
rm -f /tmp/test.png /tmp/test.pdf
