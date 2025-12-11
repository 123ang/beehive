# Check Port Usage and PM2 Processes

## Check What Ports Your Existing PM2 Processes Are Using

```bash
# Check what ports are in use
sudo netstat -tulpn | grep LISTEN

# Or use ss command (newer)
sudo ss -tulpn | grep LISTEN

# Check specific ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :4000

# Check PM2 process details
pm2 describe dms-backend
pm2 describe tree-api

# View PM2 process environment variables
pm2 env 0  # For tree-api
pm2 env 1  # For dms-backend

# Check which process is using a specific port
sudo lsof -i :3000
sudo lsof -i :4000
```

## If Ports 3000 or 4000 Are Already in Use

### Option 1: Change Beehive Ports (Recommended)

**Your Situation:**
- Port 3000 is in use by `dms-backend` ✅ Use port 3001 for Beehive web
- Port 4000 is free ✅ Keep using port 4000 for Beehive API

**Steps:**

1. **Update `.env` file** (API port stays 4000, no change needed):
   ```bash
   cd /root/projects/beehive
   nano .env
   ```
   Keep `API_PORT=4000` (it's free)

2. **Update `ecosystem.config.js`** (change web port to 3001):
   ```bash
   cd /root/projects/beehive
   nano ecosystem.config.js
   ```
   
   Change the web app port:
   ```javascript
   {
     name: 'beehive-web',
     cwd: `/root/projects/beehive/apps/web`,
     script: 'node_modules/next/dist/bin/next',
     args: 'start',
     env: {
       NODE_ENV: 'production',
       PORT: 3001,  // Changed from 3000 because dms-backend uses 3000
     },
     // ...
   }
   ```

3. **Update Nginx configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/beehive
   ```
   
   Change the upstream:
   ```nginx
   upstream api_backend {
       server localhost:4000;  # Keep 4000 (it's free)
       keepalive 64;
   }

   upstream nextjs_backend {
       server localhost:3001;  # Changed from 3000
       keepalive 64;
   }
   ```
   
   Then reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option 2: Stop Conflicting Processes (If Safe)

**⚠️ WARNING: Only do this if you're sure the other processes aren't needed!**

```bash
# Check what the processes are doing first
pm2 logs dms-backend
pm2 logs tree-api

# If safe to stop, you can stop them:
pm2 stop dms-backend
pm2 stop tree-api

# Or delete them (if not needed):
pm2 delete dms-backend
pm2 delete tree-api
```

## Verify Your Home Directory

```bash
# Check current user
whoami

# Check home directory
echo $HOME

# If you're root, HOME will be /root
# If you're another user, HOME will be /home/username
```

## Update PM2 Config Based on Your Home Directory

If you're logged in as **root**:
- Use `/root/projects/beehive` in all paths

If you're logged in as another user (e.g., `ubuntu`):
- Use `/home/ubuntu/projects/beehive` in all paths

Example for root user:

```javascript
const HOME = '/root';

module.exports = {
  apps: [
    {
      name: 'beehive-api',
      cwd: `${HOME}/projects/beehive/apps/api`,
      // ...
      error_file: `${HOME}/projects/beehive/logs/api-error.log`,
      out_file: `${HOME}/projects/beehive/logs/api-out.log`,
    },
    {
      name: 'beehive-web',
      cwd: `${HOME}/projects/beehive/apps/web`,
      // ...
      error_file: `${HOME}/projects/beehive/logs/web-error.log`,
      out_file: `${HOME}/projects/beehive/logs/web-out.log`,
    },
  ],
};
```

