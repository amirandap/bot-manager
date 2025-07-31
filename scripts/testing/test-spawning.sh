#!/bin/bash

# Test script for bot spawning functionality
echo "🧪 Testing Bot Spawning System..."

# Base URL
BASE_URL="http://localhost:3001"

echo "📋 Available endpoints:"
echo "• POST $BASE_URL/api/bots/spawn/whatsapp - Create new WhatsApp bot"
echo "• GET  $BASE_URL/api/bots - List all bots"
echo "• POST $BASE_URL/api/bots/{id}/start - Start bot"
echo "• POST $BASE_URL/api/bots/{id}/stop - Stop bot"
echo "• POST $BASE_URL/api/bots/{id}/restart - Restart bot"
echo "• DELETE $BASE_URL/api/bots/{id}/terminate - Terminate bot"
echo ""

# Function to make API calls with error handling
make_request() {
    local method=$1
    local url=$2
    local data=$3
    
    echo "📡 $method $url"
    if [ -n "$data" ]; then
        echo "📄 Data: $data"
    fi
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X "$method" \
        -H "Content-Type: application/json" \
        ${data:+-d "$data"} \
        "$url")
    
    http_status=$(echo "$response" | tail -n1 | cut -d: -f2)
    response_body=$(echo "$response" | sed '$d')
    
    echo "📊 Status: $http_status"
    echo "📄 Response:"
    echo "$response_body" | jq . 2>/dev/null || echo "$response_body"
    echo ""
    
    return $http_status
}

# Test 1: Check if backend is running
echo "🔍 Test 1: Check backend status"
make_request "GET" "$BASE_URL/api/bots"
if [ $? -ne 200 ]; then
    echo "❌ Backend is not running or not accessible"
    echo "💡 Please start the backend with: cd backend && npm start"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# Test 2: Create a new WhatsApp bot
echo "🤖 Test 2: Create new WhatsApp bot"
bot_data='{
  "name": "Test Bot 1",
  "type": "whatsapp",
  "apiHost": "http://localhost",
  "apiPort": 7260,
  "enabled": true
}'

make_request "POST" "$BASE_URL/api/bots/spawn/whatsapp" "$bot_data"
if [ $? -eq 201 ]; then
    echo "✅ Bot created successfully"
    
    # Extract bot ID from response (assuming jq is available)
    bot_id=$(echo "$response_body" | jq -r '.bot.id' 2>/dev/null)
    
    if [ "$bot_id" != "null" ] && [ -n "$bot_id" ]; then
        echo "🆔 New bot ID: $bot_id"
        
        # Test 3: Check bot status
        echo ""
        echo "📊 Test 3: Check bot status"
        make_request "GET" "$BASE_URL/api/bots"
        
        # Test 4: Check if PM2 process exists
        echo "🔍 Test 4: Check PM2 process"
        pm2_output=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name == \"$bot_id\") | .name" 2>/dev/null)
        if [ "$pm2_output" = "$bot_id" ]; then
            echo "✅ PM2 process found: $bot_id"
        else
            echo "⚠️  PM2 process not found or PM2 not available"
        fi
        
        # Test 5: Check data directories
        echo ""
        echo "📁 Test 5: Check data directories"
        session_dir="/Users/amiranda/github/bot-manager/data/sessions/$bot_id"
        qr_dir="/Users/amiranda/github/bot-manager/data/qr-codes"
        logs_dir="/Users/amiranda/github/bot-manager/data/logs/$bot_id"
        
        if [ -d "$session_dir" ]; then
            echo "✅ Session directory created: $session_dir"
        else
            echo "❌ Session directory missing: $session_dir"
        fi
        
        if [ -d "$qr_dir" ]; then
            echo "✅ QR codes directory exists: $qr_dir"
        else
            echo "❌ QR codes directory missing: $qr_dir"
        fi
        
        if [ -d "$logs_dir" ]; then
            echo "✅ Logs directory created: $logs_dir"
        else
            echo "❌ Logs directory missing: $logs_dir"
        fi
        
        # Test 6: Test bot management operations
        echo ""
        echo "🛠️  Test 6: Bot management operations"
        
        echo "🛑 Testing stop..."
        make_request "POST" "$BASE_URL/api/bots/$bot_id/stop"
        
        sleep 2
        
        echo "🚀 Testing start..."
        make_request "POST" "$BASE_URL/api/bots/$bot_id/start"
        
        sleep 2
        
        echo "🔄 Testing restart..."
        make_request "POST" "$BASE_URL/api/bots/$bot_id/restart"
        
        # Test 7: Cleanup (optional)
        echo ""
        echo "🗑️  Test 7: Cleanup (optional)"
        read -p "Do you want to delete the test bot? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🗑️  Terminating test bot..."
            make_request "DELETE" "$BASE_URL/api/bots/$bot_id/terminate"
            
            if [ $? -eq 200 ]; then
                echo "✅ Test bot terminated successfully"
            else
                echo "⚠️  Error terminating test bot"
            fi
        else
            echo "ℹ️  Test bot kept. You can manage it via the API or PM2:"
            echo "   • pm2 logs $bot_id"
            echo "   • pm2 stop $bot_id" 
            echo "   • pm2 restart $bot_id"
            echo "   • curl -X DELETE $BASE_URL/api/bots/$bot_id/terminate"
        fi
        
    else
        echo "❌ Could not extract bot ID from response"
    fi
else
    echo "❌ Failed to create bot"
fi

echo ""
echo "🎉 Test completed!"
echo ""
echo "📊 Summary:"
echo "• Backend API: $(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/bots)"
echo "• PM2 status: $(pm2 -v 2>/dev/null && echo "Available" || echo "Not available")"
echo "• Data directories: $([ -d "data" ] && echo "Created" || echo "Missing")"
echo ""
echo "💡 Tips:"
echo "• Use 'pm2 list' to see all running bots"
echo "• Use 'pm2 logs <bot-id>' to see bot logs"
echo "• Use 'pm2 monit' for real-time monitoring"
echo "• Bot sessions are stored in data/sessions/<bot-id>/"
echo "• Bot QR codes are stored in data/qr-codes/<bot-id>.png"
