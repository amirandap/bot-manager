#!/bin/bash
# SSL and Nginx Setup Script for Bot Manager
# Domain: wapi.softgrouprd.com

set -e

echo "🚀 Setting up Nginx and SSL for wapi.softgrouprd.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please don't run this script as root. Use sudo when needed.${NC}"
    exit 1
fi

# Variables
DOMAIN="wapi.softgrouprd.com"
EMAIL="admin@softgrouprd.com"  # Change this to your email
NGINX_CONFIG="/etc/nginx/sites-available/wapi.softgrouprd.com"
PROJECT_DIR="/home/linuxuser/bot-manager"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo -e "Domain: ${GREEN}$DOMAIN${NC}"
echo -e "Email: ${GREEN}$EMAIL${NC}"
echo -e "Project: ${GREEN}$PROJECT_DIR${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Update system packages
echo -e "${YELLOW}🔄 Updating system packages...${NC}"
sudo apt update

# Install Nginx if not installed
if ! command_exists nginx; then
    echo -e "${YELLOW}📦 Installing Nginx...${NC}"
    sudo apt install -y nginx
else
    echo -e "${GREEN}✅ Nginx is already installed${NC}"
fi

# Install Certbot if not installed
if ! command_exists certbot; then
    echo -e "${YELLOW}📦 Installing Certbot...${NC}"
    sudo apt install -y certbot python3-certbot-nginx
else
    echo -e "${GREEN}✅ Certbot is already installed${NC}"
fi

# Create web root for Let's Encrypt
echo -e "${YELLOW}📁 Creating web root for Let's Encrypt...${NC}"
sudo mkdir -p /var/www/html
sudo chown -R www-data:www-data /var/www/html

# Copy nginx configuration
echo -e "${YELLOW}🔧 Setting up Nginx configuration...${NC}"
sudo cp "$PROJECT_DIR/config/nginx/wapi.softgrouprd.com.conf" "$NGINX_CONFIG"

# Test nginx configuration
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

# Enable the site
echo -e "${YELLOW}🔗 Enabling the site...${NC}"
sudo ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/"

# Remove default nginx site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo -e "${YELLOW}🗑️ Removing default Nginx site...${NC}"
    sudo rm /etc/nginx/sites-enabled/default
fi

# Start and enable nginx
echo -e "${YELLOW}🚀 Starting Nginx...${NC}"
sudo systemctl start nginx
sudo systemctl enable nginx

# Check if domain resolves to this server
echo -e "${YELLOW}🌐 Checking domain resolution...${NC}"
DOMAIN_IP=$(dig +short $DOMAIN)
SERVER_IP=$(curl -s ifconfig.me)

if [ -z "$DOMAIN_IP" ]; then
    echo -e "${RED}⚠️  Warning: Domain $DOMAIN does not resolve to any IP${NC}"
    echo -e "${YELLOW}Please make sure your DNS is configured correctly before obtaining SSL certificate${NC}"
elif [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${RED}⚠️  Warning: Domain $DOMAIN resolves to $DOMAIN_IP but server IP is $SERVER_IP${NC}"
    echo -e "${YELLOW}Please make sure your DNS points to this server before obtaining SSL certificate${NC}"
else
    echo -e "${GREEN}✅ Domain resolution looks good${NC}"
fi

# Obtain SSL certificate
echo -e "${YELLOW}🔒 Obtaining SSL certificate...${NC}"
echo -e "${YELLOW}Note: Make sure your domain points to this server first!${NC}"
read -p "Continue with SSL certificate generation? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Get SSL certificate
    sudo certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
    else
        echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
        echo -e "${YELLOW}You can try again later with: sudo certbot --nginx -d $DOMAIN${NC}"
    fi
else
    echo -e "${YELLOW}⏭️ Skipping SSL certificate generation${NC}"
    echo -e "${YELLOW}You can obtain it later with: sudo certbot --nginx -d $DOMAIN${NC}"
fi

# Setup SSL certificate auto-renewal
echo -e "${YELLOW}🔄 Setting up SSL certificate auto-renewal...${NC}"
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Create log rotation for nginx
echo -e "${YELLOW}📝 Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/bot-manager > /dev/null <<EOF
/var/log/nginx/wapi.softgrouprd.com*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 www-data adm
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 \$(cat /var/run/nginx.pid)
        fi
    endscript
}
EOF

# Setup firewall rules
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
if command_exists ufw; then
    sudo ufw allow 'Nginx Full'
    sudo ufw allow ssh
    echo -e "${GREEN}✅ Firewall rules configured${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not installed, please configure firewall manually${NC}"
fi

# Final status check
echo -e "${YELLOW}🏁 Final checks...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
fi

# Show next steps
echo ""
echo -e "${GREEN}🎉 Setup completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "1. Make sure your bot manager services are running on ports 3001 and 7261"
echo -e "2. Update your .env file with the new domain configuration"
echo -e "3. Test the setup by visiting: https://$DOMAIN"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo -e "• Check Nginx status: ${GREEN}sudo systemctl status nginx${NC}"
echo -e "• Check SSL certificate: ${GREEN}sudo certbot certificates${NC}"
echo -e "• Test SSL renewal: ${GREEN}sudo certbot renew --dry-run${NC}"
echo -e "• View Nginx logs: ${GREEN}sudo tail -f /var/log/nginx/error.log${NC}"
echo ""
