#!/bin/bash

# Bot Manager CI/CD Deployment Script
# Usage: ./deploy.sh [branch]

set -e  # Exit on any error

# Configuration
BRANCH=${1:-main}
PROJECT_DIR=$(pwd)
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/deploy.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

log "🚀 Starting deployment for branch: $BRANCH"
log "📁 Project directory: $PROJECT_DIR"
log "🔄 Commit: ${DEPLOY_COMMIT:-unknown}"

# Function to cleanup on exit
cleanup() {
    log "🧹 Performing cleanup..."
    # Kill any hanging processes if needed
}
trap cleanup EXIT

# 1. Pre-deployment checks
log "🔍 Running pre-deployment checks..."

# Check if git repository
if [ ! -d ".git" ]; then
    error "Not a git repository"
    exit 1
fi

# Check if PM2 is available
if ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    error "npm is not installed"
    exit 1
fi

success "✅ Pre-deployment checks passed"

# 2. Create backup
log "💾 Creating backup..."

# Create backup of current state
BACKUP_NAME="backup_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

mkdir -p "$BACKUP_PATH"

# Backup package files and critical configs
cp package*.json "$BACKUP_PATH/" 2>/dev/null || true
cp -r config "$BACKUP_PATH/" 2>/dev/null || true
cp -r .env* "$BACKUP_PATH/" 2>/dev/null || true

# Get current commit for rollback
git rev-parse HEAD > "$BACKUP_PATH/commit.txt"

success "✅ Backup created at $BACKUP_PATH"

# 3. Fetch latest changes
log "📥 Fetching latest changes from origin/$BRANCH..."

# Stash any local changes
git stash push -m "Auto-stash before deployment $TIMESTAMP" || true

# Fetch and checkout
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

CURRENT_COMMIT=$(git rev-parse HEAD)
log "📄 Updated to commit: $CURRENT_COMMIT"

success "✅ Code updated successfully"

# 4. Check for dependency changes
log "🔍 Checking for dependency changes..."

DEPS_CHANGED=false

# Check root package.json
if ! cmp -s package.json "$BACKUP_PATH/package.json" 2>/dev/null; then
    DEPS_CHANGED=true
    log "📦 Root dependencies changed"
fi

# Check backend package.json
if ! cmp -s backend/package.json "$BACKUP_PATH/backend/package.json" 2>/dev/null; then
    DEPS_CHANGED=true
    log "📦 Backend dependencies changed"
fi

# Check frontend package.json
if ! cmp -s frontend/package.json "$BACKUP_PATH/frontend/package.json" 2>/dev/null; then
    DEPS_CHANGED=true
    log "📦 Frontend dependencies changed"
fi

# 5. Install dependencies if needed
if [ "$DEPS_CHANGED" = true ]; then
    log "📦 Installing dependencies..."
    
    npm install
    cd backend && npm install && cd ..
    cd frontend && npm install && cd ..
    
    success "✅ Dependencies updated"
else
    log "📦 No dependency changes detected, skipping installation"
fi

# 6. Build the project
log "🔨 Building project..."

# Build backend
log "🔨 Building backend..."
cd backend
npm run build
cd ..

# Build frontend
log "🔨 Building frontend..."
cd frontend
npm run build
cd ..

success "✅ Build completed successfully"

# 7. Run tests if available
if [ -f "package.json" ] && npm run | grep -q "test"; then
    log "🧪 Running tests..."
    npm test || {
        error "Tests failed, aborting deployment"
        exit 1
    }
    success "✅ Tests passed"
fi

# 8. Restart services with PM2
log "🔄 Restarting services..."

# Check if ecosystem.config.js exists
if [ -f "ecosystem.config.js" ]; then
    log "🔄 Restarting all services with PM2 ecosystem..."
    pm2 reload ecosystem.config.js --update-env
else
    log "🔄 Restarting individual services..."
    
    # Restart backend if running
    if pm2 list | grep -q "bot-manager-backend"; then
        pm2 restart bot-manager-backend
        log "🔄 Restarted backend service"
    fi
    
    # Restart frontend if running
    if pm2 list | grep -q "bot-manager-frontend"; then
        pm2 restart bot-manager-frontend
        log "🔄 Restarted frontend service"
    fi
fi

# Wait for services to start
sleep 5

success "✅ Services restarted successfully"

# 9. Health checks
log "🏥 Running health checks..."

# Check backend health
BACKEND_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3001}"
if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    success "✅ Backend health check passed"
else
    error "❌ Backend health check failed"
    # Could trigger rollback here
fi

# Check frontend (if applicable)
FRONTEND_URL="http://localhost:7261"
if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
    success "✅ Frontend health check passed"
else
    warning "⚠️  Frontend health check failed (might be normal for some setups)"
fi

# 10. Cleanup old backups (keep last 10)
log "🧹 Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs -r rm -rf
cd "$PROJECT_DIR"

# 11. Final status
log "📊 Deployment Status:"
log "   Branch: $BRANCH"
log "   Commit: $CURRENT_COMMIT"
log "   Timestamp: $TIMESTAMP"
log "   Backup: $BACKUP_NAME"

success "🎉 Deployment completed successfully!"

# Optional: Send notification (Slack, Discord, etc.)
if [ -n "$WEBHOOK_URL" ]; then
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"✅ Bot Manager deployed successfully\\nBranch: $BRANCH\\nCommit: ${CURRENT_COMMIT:0:8}\\nTime: $TIMESTAMP\"}" \
        > /dev/null 2>&1 || true
fi

log "🏁 Deployment script completed"
