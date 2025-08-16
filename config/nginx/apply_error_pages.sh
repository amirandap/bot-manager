#!/bin/bash
# Script to apply custom error pages to Nginx

# Create directory for error pages
echo "Creating directory for error pages..."
sudo mkdir -p /etc/nginx/error_pages/bot-manager

# Copy error pages
echo "Copying custom error pages..."
sudo cp -v /home/linuxuser/bot-manager/config/nginx/error_pages/* /etc/nginx/error_pages/bot-manager/

# Update Nginx configuration
echo "Updating Nginx configuration..."
sudo cp -v /home/linuxuser/bot-manager/config/nginx/wapi.softgrouprd.com.conf /etc/nginx/sites-available/

# Ensure symbolic link exists
if [[ ! -L /etc/nginx/sites-enabled/wapi.softgrouprd.com.conf ]]; then
  echo "Creating symbolic link..."
  sudo ln -sf /etc/nginx/sites-available/wapi.softgrouprd.com.conf /etc/nginx/sites-enabled/
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
  echo "Reloading Nginx..."
  sudo systemctl reload nginx
  echo "✅ Custom error pages have been successfully applied!"
else
  echo "❌ Nginx configuration test failed. Please check the configuration."
  exit 1
fi
