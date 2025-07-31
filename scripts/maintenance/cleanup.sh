#!/bin/bash

# 🧹 Bot Manager - Cleanup and Maintenance Script
# This script cleans up temporary files, logs, and unnecessary data

echo "🧹 Starting Bot Manager Cleanup..."

# Function to safely remove files/directories
safe_remove() {
    if [ -e "$1" ]; then
        rm -rf "$1"
        echo "✅ Removed: $1"
    else
        echo "ℹ️  Not found: $1"
    fi
}

# Function to clean old log files (keep last 30 days)
clean_old_logs() {
    echo "🗂️  Cleaning old log files..."
    find logs/ -name "*.log" -mtime +30 -delete 2>/dev/null
    find data/logs/ -type d -mtime +30 -exec rm -rf {} + 2>/dev/null
    echo "✅ Old logs cleaned"
}

# Function to clean node_modules if requested
clean_node_modules() {
    if [ "$1" = "--deep" ]; then
        echo "🗂️  Deep cleaning node_modules..."
        safe_remove "backend/node_modules"
        safe_remove "frontend/node_modules" 
        safe_remove "bot/node_modules"
        safe_remove "node_modules"
        echo "✅ Node modules cleaned"
    fi
}

# Function to clean build artifacts
clean_build_artifacts() {
    echo "🏗️  Cleaning build artifacts..."
    safe_remove "backend/dist"
    safe_remove "frontend/.next"
    safe_remove "bot/dist"
    echo "✅ Build artifacts cleaned"
}

# Function to clean temporary files
clean_temp_files() {
    echo "🗑️  Cleaning temporary files..."
    find . -name "*.tmp" -delete 2>/dev/null
    find . -name "*.temp" -delete 2>/dev/null
    find . -name ".DS_Store" -delete 2>/dev/null
    find . -name "Thumbs.db" -delete 2>/dev/null
    echo "✅ Temporary files cleaned"
}

# Function to clean QR codes older than 1 day
clean_old_qr_codes() {
    echo "📱 Cleaning old QR codes..."
    find data/qr-codes/ -name "*.png" -mtime +1 -delete 2>/dev/null
    echo "✅ Old QR codes cleaned"
}

# Main cleanup execution
echo "📍 Working directory: $(pwd)"

# Always run basic cleanup
clean_temp_files
clean_old_logs
clean_old_qr_codes

# Check for flags
case "$1" in
    --deep)
        echo "🔥 Deep cleanup mode activated"
        clean_node_modules --deep
        clean_build_artifacts
        ;;
    --build)
        echo "🏗️  Build cleanup mode"
        clean_build_artifacts
        ;;
    --help)
        echo "🧹 Bot Manager Cleanup Script"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (no args)    Basic cleanup (temp files, old logs, old QR codes)"
        echo "  --deep       Deep cleanup (includes node_modules and build artifacts)"
        echo "  --build      Clean only build artifacts"
        echo "  --help       Show this help message"
        echo ""
        exit 0
        ;;
    *)
        echo "ℹ️  Basic cleanup completed. Use --help for more options."
        ;;
esac

echo ""
echo "✨ Cleanup completed successfully!"
echo "💡 Tip: Use 'npm run cleanup:deep' for deep cleaning"
