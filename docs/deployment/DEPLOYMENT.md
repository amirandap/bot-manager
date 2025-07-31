# Deployment Guide

## Production Deployment

### 1. Environment Configuration

For production deployment, update the environment variables in `.env` to match your server setup:

```bash
# Edit .env with your actual domain/IP addresses
nano .env
```

Update these key variables:

```bash
# Set to production
NODE_ENV=production

# Your actual domain or server IP
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com  # or http://your-server-ip:3001
FRONTEND_URL=https://yourdomain.com                  # or http://your-server-ip:7261

# Server binding (0.0.0.0 for all interfaces)
SERVER_HOST=0.0.0.0

# Your bot server location (use 0.0.0.0 for local/nginx setup)
DEFAULT_BOT_HOST=0.0.0.0                             # or localhost for local development

# Disable development features
DEV_MODE=false
LOG_LEVEL=info
```

### 2. Common Deployment Scenarios

#### Scenario 1: Single VPS with IP Address

```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=http://123.456.789.10:3001
FRONTEND_URL=http://123.456.789.10:7261
SERVER_HOST=0.0.0.0
DEFAULT_BOT_HOST=0.0.0.0
```

#### Scenario 2: Domain with HTTPS (Recommended)

```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
SERVER_HOST=0.0.0.0
DEFAULT_BOT_HOST=0.0.0.0
```

#### Scenario 3: Subdomain Setup

```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://dashboard.yourdomain.com
SERVER_HOST=0.0.0.0
DEFAULT_BOT_HOST=0.0.0.0
```

### 3. Build and Deploy Commands

```bash
# Install dependencies
npm run install:all

# Build for production
npm run build

# Start production server
npm run start
```

### 4. Process Management (PM2 Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 5. Reverse Proxy Setup (Nginx Example)

```nginx
# /etc/nginx/sites-available/bot-manager
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:7261;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. Security Considerations

- Use HTTPS in production (Let's Encrypt with Certbot)
- Set proper CORS origins in `FRONTEND_URL`
- Use strong passwords for any authentication
- Keep your server and dependencies updated
- Consider using a firewall to restrict access to necessary ports only

### 7. Monitoring

- Use PM2 for process monitoring: `pm2 monit`
- Check logs: `pm2 logs`
- Monitor server resources
- Set up health checks for your bot instances
