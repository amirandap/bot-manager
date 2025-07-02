#!/bin/bash

# Script to check and manage port conflicts for the bot manager

echo "🔍 Checking for processes using ports 3001 and 7261..."

# Check port 3001 (backend)
echo ""
echo "=== PORT 3001 (Backend) ==="
BACKEND_PIDS=$(lsof -ti:3001)
if [ -n "$BACKEND_PIDS" ]; then
    echo "⚠️  Processes found using port 3001:"
    lsof -i:3001
    echo ""
    echo "To kill these processes, run:"
    echo "kill -9 $BACKEND_PIDS"
else
    echo "✅ Port 3001 is available"
fi

# Check port 7261 (frontend)
echo ""
echo "=== PORT 7261 (Frontend) ==="
FRONTEND_PIDS=$(lsof -ti:7261)
if [ -n "$FRONTEND_PIDS" ]; then
    echo "⚠️  Processes found using port 7261:"
    lsof -i:7261
    echo ""
    echo "To kill these processes, run:"
    echo "kill -9 $FRONTEND_PIDS"
else
    echo "✅ Port 7261 is available"
fi

# Check PM2 processes
echo ""
echo "=== PM2 PROCESSES ==="
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2 not installed or not in PATH"
fi

echo ""
echo "💡 To clean up all processes:"
echo "   Backend: kill -9 \$(lsof -ti:3001)"
echo "   Frontend: kill -9 \$(lsof -ti:7261)"
echo "   PM2: pm2 kill"
