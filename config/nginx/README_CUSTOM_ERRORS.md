# Nginx Custom Error Pages

Custom error pages have been created for the bot-manager Nginx configuration.

## Files created:
- `/home/linuxuser/bot-manager/config/nginx/error_pages/502.html` - Specific 502 Bad Gateway error page
- `/home/linuxuser/bot-manager/config/nginx/error_pages/error.html` - Dynamic error page for other HTTP errors

## Configuration changes:
- Added custom error page directives to the Nginx configuration
- Set up a location block to serve these error pages

## How to apply changes:

1. Copy the error pages to the server:
```bash
sudo mkdir -p /etc/nginx/error_pages/bot-manager
sudo cp /home/linuxuser/bot-manager/config/nginx/error_pages/* /etc/nginx/error_pages/bot-manager/
```

2. Update the Nginx configuration:
```bash
sudo cp /home/linuxuser/bot-manager/config/nginx/wapi.softgrouprd.com.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/wapi.softgrouprd.com.conf /etc/nginx/sites-enabled/
```

3. Test the Nginx configuration:
```bash
sudo nginx -t
```

4. If the test passes, reload Nginx:
```bash
sudo systemctl reload nginx
```

## Features of the custom error pages:

- Modern, responsive design
- Automatic reload functionality for 502 errors
- Real-time clock display
- Clear error descriptions
- Easy navigation back to the homepage
- Technical information for debugging

## Testing:

After deploying, you can test the error pages by:
1. Temporarily stopping the backend service: `pm2 stop bot-manager-backend`
2. Accessing the API endpoints, which should now show the custom 502 page
3. Restart the service: `pm2 start bot-manager-backend`
