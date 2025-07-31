# CI/CD Platform for Bot Manager

## Overview

Automated deployment pipeline that pulls changes from Git and restarts services on commit.

## Architecture

```
GitHub/GitLab → Webhook → Deploy API → Git Pull → Build → PM2 Restart
```

## Components

1. **Webhook Endpoint** (`/api/deploy/webhook`) - Receives commit notifications
2. **Deploy Script** (`scripts/deploy.sh`) - Handles the deployment process
3. **PM2 Ecosystem** (`ecosystem.config.js`) - Manages service restarts
4. **Deployment Manager** (Frontend) - UI for manual deployments and monitoring
5. **Backup System** - Creates backups before deployment
6. **Health Checks** - Verifies deployment success

## Quick Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Optional: Webhook signature verification
WEBHOOK_SECRET=your-webhook-secret-here

# Optional: Notification webhook (Slack/Discord)
WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 2. Start Services with PM2

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 3. Setup Git Repository Webhook

#### GitHub:

1. Go to your repository → Settings → Webhooks
2. Add webhook with URL: `https://your-domain.com/api/deploy/webhook`
3. Set content type to `application/json`
4. Select "Just the push event"
5. Add secret if using `WEBHOOK_SECRET`

#### GitLab:

1. Go to your project → Settings → Webhooks
2. Add webhook with URL: `https://your-domain.com/api/deploy/webhook`
3. Select "Push events"
4. Add secret token if using `WEBHOOK_SECRET`

### 4. Test Deployment

```bash
# Manual deployment via API
curl -X POST https://your-domain.com/api/deploy/trigger \
  -H "Content-Type: application/json" \
  -d '{"branch": "main"}'

# Or use the frontend deployment manager
```

## API Endpoints

### Webhook Endpoint

```http
POST /api/deploy/webhook
Content-Type: application/json
X-Hub-Signature-256: sha256=... (if using secret)

# GitHub/GitLab webhook payload
```

### Manual Deployment

```http
POST /api/deploy/trigger
Content-Type: application/json

{
  "branch": "main"  // optional, defaults to main
}
```

### Deployment Status

```http
GET /api/deploy/status

# Returns:
{
  "deploymentInProgress": false,
  "queueLength": 0,
  "lastDeployment": {
    "timestamp": "2025-06-14T...",
    "status": "success",
    "branch": "main",
    "commit": "abc123..."
  }
}
```

## Deployment Process

### 1. Pre-deployment Checks

- Verify git repository
- Check PM2, Node.js, npm availability
- Validate environment

### 2. Backup Creation

- Backup current package.json files
- Backup config files and .env
- Save current git commit for rollback

### 3. Code Update

- Stash local changes
- Fetch and pull latest changes
- Check for dependency changes

### 4. Build Process

- Install dependencies if changed
- Build backend (TypeScript compilation)
- Build frontend (Next.js production build)
- Run tests if available

### 5. Service Restart

- Reload PM2 ecosystem with new code
- Graceful restart of all services
- Wait for services to stabilize

### 6. Health Checks

- Backend health check (`/health`)
- Frontend availability check
- Log results

### 7. Cleanup

- Remove old backups (keep last 10)
- Send notifications if configured

## File Structure

```
bot-manager/
├── ecosystem.config.js          # PM2 configuration
├── scripts/
│   └── deploy.sh               # Main deployment script
├── logs/
│   ├── deploy.log             # Deployment logs
│   ├── deployments.json      # Deployment history
│   ├── backend-*.log          # Backend PM2 logs
│   └── frontend-*.log         # Frontend PM2 logs
├── backups/
│   ├── backup_20250614_120000/ # Timestamped backups
│   └── ...
└── backend/src/
    ├── controllers/deployController.ts
    └── routes/deployRoutes.ts
```

## Security Features

### Webhook Signature Verification

```bash
# Set webhook secret in environment
WEBHOOK_SECRET=your-secret-key

# GitHub will sign requests with this secret
# GitLab supports token-based authentication
```

### Deployment Locks

- Only one deployment can run at a time
- Additional deployments are queued
- Prevents conflicts and resource issues

### Branch Protection

- Only deploys from main/master branch
- Ignores feature branch pushes
- Configurable branch filtering

## Monitoring & Logging

### Deployment Logs

- All deployments logged to `logs/deployments.json`
- Detailed output in `logs/deploy.log`
- PM2 service logs in separate files

### Frontend Dashboard

- Real-time deployment status
- Deployment history and details
- Manual deployment trigger
- Error reporting and troubleshooting

### Health Monitoring

- Automatic health checks post-deployment
- Service availability verification
- Rollback capabilities on failure

## Production Considerations

### 1. Server Setup

```bash
# Ensure adequate permissions
sudo chown -R $USER:$USER /path/to/bot-manager
chmod +x scripts/deploy.sh

# Setup log rotation
sudo logrotate -d /etc/logrotate.d/bot-manager
```

### 2. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Webhook endpoint
    location /api/deploy {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Other routes...
}
```

### 3. Monitoring

- Setup log monitoring (ELK stack, Grafana)
- Configure alerts for failed deployments
- Monitor resource usage during deployments

### 4. Backup Strategy

- Automated database backups
- Configuration file versioning
- Disaster recovery procedures

## Troubleshooting

### Common Issues

1. **Permission denied**: Check file permissions and ownership
2. **PM2 not found**: Install PM2 globally or update PATH
3. **Git conflicts**: Script automatically stashes changes
4. **Health check failures**: Check service logs and ports
5. **Webhook not triggering**: Verify URL and secret configuration

### Debug Commands

```bash
# Check PM2 status
pm2 list
pm2 logs

# Manual deployment test
bash scripts/deploy.sh main

# Check deployment logs
tail -f logs/deploy.log
cat logs/deployments.json | jq '.[].status'

# Webhook testing
curl -X POST localhost:3001/api/deploy/trigger
```

## Advanced Features

### Custom Notifications

The system supports webhook notifications to Slack, Discord, or custom endpoints:

```bash
# Add to .env
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Or Discord
WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
```

### Rollback Capability

```bash
# Rollback to previous commit (manual)
cd backups/backup_YYYYMMDD_HHMMSS
git checkout $(cat commit.txt)
pm2 reload ecosystem.config.js
```

### Multi-Environment Support

Modify `ecosystem.config.js` to support staging/production environments:

```javascript
env_staging: {
  NODE_ENV: 'staging',
  PORT: 3002
}
```

This CI/CD platform provides a robust, automated deployment solution that keeps your bot manager updated and running smoothly with minimal manual intervention.
