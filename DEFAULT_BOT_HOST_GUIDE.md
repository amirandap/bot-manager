# DEFAULT_BOT_HOST Configuration Guide

## Overview

The `DEFAULT_BOT_HOST` environment variable provides a fallback host for bot instances that don't have a specific `apiHost` configured in `config/bots.json`.

## Smart Fallback Logic

The system now uses intelligent defaults based on the deployment environment:

### Priority Order:

1. **Environment Variable**: Value from `DEFAULT_BOT_HOST` in `.env` files
2. **Smart Defaults**: Automatic selection based on environment:
   - **Production**: `0.0.0.0` (nginx-compatible)
   - **Development**: `localhost`

## Configuration Examples

### Development Environment (`.env.development`)

```bash
# For local development
DEFAULT_BOT_HOST=localhost
```

### Production Environment (`.env.production`)

```bash
# For production with nginx/reverse proxy
DEFAULT_BOT_HOST=0.0.0.0
```

### PM2 Production (`ecosystem.config.js`)

```javascript
env: {
  NODE_ENV: "production",
  SERVER_HOST: "0.0.0.0",
  DEFAULT_BOT_HOST: "0.0.0.0",  // nginx-compatible
}
```

## Why Use 0.0.0.0 in Production?

### Benefits:

1. **Nginx Compatibility**: Works seamlessly with reverse proxy configurations
2. **Container Support**: Compatible with Docker and containerized deployments
3. **Network Flexibility**: Allows connections from any network interface
4. **Load Balancer Friendly**: Works with load balancers and service meshes

### Traditional vs Modern Approach:

```bash
# ❌ Old: Hardcoded IP (inflexible)
DEFAULT_BOT_HOST=66.42.90.210

# ✅ New: Environment-aware (flexible)
DEFAULT_BOT_HOST=0.0.0.0  # Production
DEFAULT_BOT_HOST=localhost # Development
```

## Bot Configuration Examples

### Bot with Specific Host (no fallback needed)

```json
{
  "id": "whatsapp-bot-1",
  "name": "WhatsApp Bot 1",
  "apiHost": "http://192.168.1.100",  // Uses this specific host
  "apiPort": 7260
}
```

### Bot Using Fallback Host

```json
{
  "id": "whatsapp-bot-2",
  "name": "WhatsApp Bot 2",
  "apiHost": "",  // Empty - will use DEFAULT_BOT_HOST
  "apiPort": 7261
}
```

## Nginx Configuration Example

When using `DEFAULT_BOT_HOST=0.0.0.0`, your nginx config can be:

```nginx
upstream bot_backend {
    server 0.0.0.0:7260;
    server 0.0.0.0:7261;
    server 0.0.0.0:7262;
}

server {
    listen 80;
    server_name bots.yourdomain.com;
    
    location / {
        proxy_pass http://bot_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues:

1. **Connection Refused**: Check if bots are running on expected ports
2. **Network Unreachable**: Verify firewall rules for 0.0.0.0 binding
3. **CORS Issues**: Ensure FRONTEND_URL matches your domain setup

### Debug Commands:

```bash
# Check what host is being used
grep -r "DEFAULT_BOT_HOST" .env*

# Test bot connectivity
curl http://0.0.0.0:7260/status
curl http://localhost:7260/status

# Check running bot processes
pm2 list
```

## Migration from Hardcoded IPs

If migrating from hardcoded IP addresses:

1. **Update Environment Files**:
   ```bash
   # Replace hardcoded IPs
   sed -i 's/DEFAULT_BOT_HOST=66.42.90.210/DEFAULT_BOT_HOST=0.0.0.0/g' .env.production
   ```

2. **Update Bot Configurations**:
   - Remove specific IPs from `config/bots.json`
   - Let system use smart defaults

3. **Test Connectivity**:
   ```bash
   # Test after changes
   npm run dev
   curl http://localhost:3001/api/status
   ```

## Best Practices

1. **Development**: Always use `localhost` for local development
2. **Production**: Use `0.0.0.0` for maximum compatibility
3. **Docker**: Use `0.0.0.0` for container deployments
4. **Testing**: Test both host configurations before deployment
5. **Documentation**: Document any custom host requirements

This approach provides maximum flexibility while maintaining backward compatibility and improving deployment scenarios.
