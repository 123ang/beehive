# Quick Fix for Nginx SSL Certificate Error

## Problem
Nginx configuration references SSL certificates that don't exist yet, causing the config test to fail.

## Solution

### Step 1: Edit the Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/beehive
```

### Step 2: Replace the entire content with this HTTP-only configuration:

```nginx
# Upstream for API server
upstream api_backend {
    server localhost:4000;
    keepalive 64;
}

# Upstream for Next.js server
upstream nextjs_backend {
    server localhost:3000;
    keepalive 64;
}

# HTTP server (will be upgraded to HTTPS by Certbot)
server {
    listen 80;
    listen [::]:80;
    server_name beehive-lifestyle.info www.beehive-lifestyle.info;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Logging
    access_log /var/log/nginx/beehive-access.log;
    error_log /var/log/nginx/beehive-error.log;

    # Increase body size for file uploads
    client_max_body_size 50M;

    # API proxy
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Next.js frontend
    location / {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://nextjs_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Save and exit (Ctrl+X, then Y, then Enter).

### Step 3: Test the Configuration

```bash
sudo nginx -t
```

If you see "syntax is ok" and "test is successful", proceed to Step 4.

### Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 5: Get SSL Certificate (After Nginx is Working)

**Important:** Make sure your domain DNS (beehive-lifestyle.info) is pointing to your server IP before running this.

```bash
sudo certbot --nginx -d beehive-lifestyle.info -d www.beehive-lifestyle.info
```

Certbot will:
- Obtain SSL certificates
- Automatically update your Nginx config to add HTTPS
- Set up HTTP to HTTPS redirect (if you choose Yes)

### Step 6: Verify SSL is Working

```bash
# Test the configuration again
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Test your site
curl -I http://beehive-lifestyle.info
curl -I https://beehive-lifestyle.info
```

## Troubleshooting

If you still get errors:

1. **Check if the site is enabled:**
   ```bash
   ls -la /etc/nginx/sites-enabled/ | grep beehive
   ```

2. **If not enabled, enable it:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/beehive /etc/nginx/sites-enabled/beehive
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Check for syntax errors:**
   ```bash
   sudo nginx -t
   ```

4. **View Nginx error log:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

