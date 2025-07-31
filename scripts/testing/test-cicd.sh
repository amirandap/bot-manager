#!/bin/bash

# Test CI/CD System
echo "🧪 Testing CI/CD Platform..."

API_BASE="http://localhost:3001"

echo ""
echo "📋 Testing CI/CD Endpoints:"
echo "1. Deployment Status"
echo "2. System Health"
echo "3. Manual Deployment Trigger"
echo ""

# Test 1: Check deployment status
echo "🔍 Test 1: Checking deployment status..."
curl -s -X GET "$API_BASE/api/deploy/status" | jq . 2>/dev/null || echo "❌ Failed to get deployment status"
echo ""

# Test 2: Check system health
echo "🏥 Test 2: Checking system health..."
curl -s -X GET "$API_BASE/api/deploy/health" | jq . 2>/dev/null || echo "❌ Failed to get system health"
echo ""

# Test 3: Check backend health
echo "💚 Test 3: Checking backend health..."
curl -s -X GET "$API_BASE/health" | jq . 2>/dev/null || echo "❌ Failed to get backend health"
echo ""

# Test 4: Check if PM2 is running
echo "⚙️ Test 4: Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 is installed"
    pm2 jlist | jq '.[] | {name: .name, status: .pm2_env.status}' 2>/dev/null || echo "No PM2 processes running"
else
    echo "❌ PM2 is not installed"
fi
echo ""

# Test 5: Check if deployment script exists
echo "📜 Test 5: Checking deployment script..."
if [ -f "scripts/deploy.sh" ]; then
    echo "✅ Deployment script exists"
    echo "   Permissions: $(ls -la scripts/deploy.sh | cut -d' ' -f1)"
    if [ -x "scripts/deploy.sh" ]; then
        echo "   ✅ Script is executable"
    else
        echo "   ❌ Script is not executable (run: chmod +x scripts/deploy.sh)"
    fi
else
    echo "❌ Deployment script not found"
fi
echo ""

# Test 6: Check ecosystem config
echo "🏗️ Test 6: Checking PM2 ecosystem config..."
if [ -f "ecosystem.config.js" ]; then
    echo "✅ PM2 ecosystem config exists"
    node -c ecosystem.config.js && echo "   ✅ Config syntax is valid" || echo "   ❌ Config syntax error"
else
    echo "❌ PM2 ecosystem config not found"
fi
echo ""

# Test 7: Check log directories
echo "📁 Test 7: Checking log directories..."
if [ -d "logs" ]; then
    echo "✅ Logs directory exists"
    echo "   Files: $(ls logs/ 2>/dev/null | wc -l) log files"
    if [ -f "logs/deployments.json" ]; then
        echo "   ✅ Deployment history file exists"
    else
        echo "   ℹ️ No deployment history yet"
    fi
else
    echo "❌ Logs directory not found"
fi
echo ""

# Test 8: Manual deployment test (optional)
echo "🚀 Test 8: Manual deployment test (optional)..."
read -p "Do you want to trigger a test deployment? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Triggering manual deployment..."
    curl -s -X POST "$API_BASE/api/deploy/trigger" \
        -H "Content-Type: application/json" \
        -d '{"branch": "main"}' | jq . 2>/dev/null || echo "❌ Failed to trigger deployment"
    
    echo "Check deployment status in the web dashboard or with:"
    echo "curl $API_BASE/api/deploy/status | jq ."
else
    echo "Skipped manual deployment test"
fi
echo ""

echo "🎉 CI/CD System Test Complete!"
echo ""
echo "📋 Summary:"
echo "• Backend API: http://localhost:3001"
echo "• Frontend Dashboard: http://localhost:7261"
echo "• Webhook Endpoint: $API_BASE/api/deploy/webhook"
echo ""
echo "🔗 Next Steps:"
echo "1. Configure your Git webhook to point to the webhook endpoint"
echo "2. Set WEBHOOK_SECRET in your .env file for security"
echo "3. Monitor deployments via the dashboard or API"
echo "4. Test by pushing commits to your main/master branch"
