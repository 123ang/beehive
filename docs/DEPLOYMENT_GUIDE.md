# 🚀 Beehive Deployment Guide - Ubuntu 24.04

Complete guide to deploy Beehive to Ubuntu 24.04 VPS with Nginx and MySQL.

## 📋 Prerequisites

- Ubuntu 24.04 VPS
- Root or sudo access
- Domain name: `beehive-lifestyle.info` (DNS configured)
- Nginx installed
- MySQL installed
- SSH access to server

**Note:** This guide assumes you're logged in as `root`. If you're using a different user, replace `/root` with `/home/your-username` in all paths.

---

## 1. Server Setup

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 20.x

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version
```

### 1.3 Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version  # Should be 9.x.x
```

### 1.4 Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return PONG
```

### 1.5 Install PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the instructions shown
```

### 1.6 Install Certbot (for SSL)

```bash
# Install Certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
```

---

## 2. Database Setup

### 2.1 Create Database and User

#### Option A: Using MySQL Root (Recommended for Initial Setup)

```bash
# Login to MySQL as root
sudo mysql -u root -p
# Enter your MySQL root password when prompted
```

In the MySQL prompt, run:

```sql
-- Create database
CREATE DATABASE beehive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'beehive_user' and 'your_strong_password' with your desired username and password)
CREATE USER 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';

-- Grant all privileges on the beehive database to the new user
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;

-- Verify the user was created
SELECT user, host FROM mysql.user WHERE user = 'beehive_user';

-- Exit MySQL
EXIT;
```

#### Option B: Create User with Specific Privileges (More Secure)

If you want to limit the user's privileges for security:

```sql
-- Create user
CREATE USER 'beehive_user'@'localhost' IDENTIFIED BY 'your_strong_password';

-- Grant only necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON beehive.* TO 'beehive_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
```

#### Option C: Create User for Remote Access (If needed)

If you need to access the database from another server:

```sql
-- Create user that can connect from any IP (use with caution)
CREATE USER 'beehive_user'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'%';
FLUSH PRIVILEGES;

-- OR create user for specific IP only (more secure)
CREATE USER 'beehive_user'@'192.168.1.100' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'192.168.1.100';
FLUSH PRIVILEGES;
```

### 2.2 Update Application Configuration

After creating the database user, update your `.env` file:

```bash
# Navigate to your project directory
cd /root/projects/beehive

# Edit the .env file
nano .env
```

Update the `DATABASE_URL` line:

```env
# Replace with your actual username and password
DATABASE_URL=mysql://beehive_user:920214@Ang@localhost:3306/beehive
```

**Format breakdown:**
```
mysql://[username]:[password]@[host]:[port]/[database_name]
```

**Example:**
```env
# If username is 'beehive_user' and password is 'MySecurePass123!'
DATABASE_URL=mysql://beehive_user:920214%40Ang@localhost:3306/beehive
```

**Important:** If your password contains special characters, you may need to URL-encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`
- `+` becomes `%2B`
- `=` becomes `%3D`
- `?` becomes `%3F`
- `/` becomes `%2F`

**Example with special characters:**
```env
# Password: P@ssw0rd#123
DATABASE_URL=mysql://beehive_user:P%40ssw0rd%23123@localhost:3306/beehive
```

Save and exit (Ctrl+X, then Y, then Enter).

### 2.3 Verify Database Connection

#### Test Connection from Command Line

```bash
# Test connection with the new user
mysql -u beehive_user -p beehive
# Enter the password when prompted

# If successful, you'll see the MySQL prompt
# Type EXIT; to leave
```

#### Test Connection from Application

```bash
# Navigate to API directory
cd ~/projects/beehive/apps/api

# Test database connection (if you have a test script)
# Or run the API and check logs
pnpm dev

# Check if there are any connection errors
```

### 2.4 Troubleshooting Connection Issues

#### Issue: Access Denied

```bash
# Check if user exists
sudo mysql -u root -p
```

```sql
SELECT user, host FROM mysql.user WHERE user = 'beehive_user';
```

If user doesn't exist, recreate it using the steps in 2.1.

#### Issue: Password Not Working

```bash
# Reset password
sudo mysql -u root -p
```

```sql
-- Change password
ALTER USER 'beehive_user'@'localhost' IDENTIFIED BY 'new_strong_password';
FLUSH PRIVILEGES;
EXIT;
```

Then update your `.env` file with the new password.

#### Issue: User Exists But Can't Connect

```sql
-- Check user privileges
SHOW GRANTS FOR 'beehive_user'@'localhost';

-- If no privileges shown, grant them again
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2.5 Change Existing User Password

If you want to change the password for an existing user:

```bash
sudo mysql -u root -p
```

```sql
-- Change password
ALTER USER 'beehive_user'@'localhost' IDENTIFIED BY 'new_strong_password';
FLUSH PRIVILEGES;
EXIT;
```

Then update your `.env` file with the new password.

### 2.6 Delete User (If Needed)

If you need to remove a user:

```bash
sudo mysql -u root -p
```

```sql
-- Revoke all privileges first
REVOKE ALL PRIVILEGES ON beehive.* FROM 'beehive_user'@'localhost';

-- Drop the user
DROP USER 'beehive_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Application Deployment

### 3.1 Create Application Directory

```bash
# Create directory for application
# Note: If you're logged in as root, ~ refers to /root
mkdir -p /root/projects/beehive
cd /root/projects/beehive
```

### 3.2 Clone Repository

```bash
# Option 1: Clone from Git (if using Git)
git clone https://github.com/your-username/beehive.git .

# Option 2: Upload files via SCP/SFTP
# Use FileZilla, WinSCP, or scp command from your local machine:
# scp -r /path/to/beehive/* root@your-server:/root/projects/beehive/
```
```

### 3.3 Install Dependencies

```bash
# Install all dependencies
pnpm install

# Build shared package first
cd packages/shared
pnpm build
cd ../..
```

### 3.4 Create Environment File

```bash
# Create .env file
nano .env
```

Add the following content (update with your values):

```env
# ============================================
# BEEHIVE PRODUCTION CONFIGURATION
# ============================================

# Database (MySQL)
DATABASE_URL=mysql://beehive_user:920214%40Ang@localhost:3306/beehive

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret (generate a strong random string)
JWT_SECRET=eRzHLgIi7aeJLFp0Rwb2D6FBTwhu6wyXlIc+iHn7Teg=

# API Configuration
# Note: Using port 4001 to avoid conflicts with existing processes
API_PORT=4001
NODE_ENV=production

# Frontend Configuration
# IMPORTANT: Leave this EMPTY or unset in production if using same domain
# The frontend will use relative paths (/api/*) which Nginx will proxy to the API backend
# NEXT_PUBLIC_API_URL=
# 
# Only set this if you want to use a separate API subdomain:
# NEXT_PUBLIC_API_URL=https://api.beehive-lifestyle.info
# 
# Or if using same domain with full URL:
# NEXT_PUBLIC_API_URL=https://beehive-lifestyle.info/api
NEXT_PUBLIC_CHAIN_ID=42161
NEXT_PUBLIC_WALLET_CONNECT_ID=bbef8141df63638e7cd94f8b9c098b68

# Domain
NEXT_PUBLIC_DOMAIN=https://beehive-lifestyle.info

# Contract Addresses (update after deployment)
NEXT_PUBLIC_MEMBERSHIP_CONTRACT=0x...
NEXT_PUBLIC_REWARDS_CONTRACT=0x...
NEXT_PUBLIC_BCC_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_USDT_CONTRACT=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
```

**Generate JWT Secret:**
```bash
# Generate a random JWT secret
openssl rand -base64 32
# Copy the output and paste it as JWT_SECRET value
```

Save and exit (Ctrl+X, then Y, then Enter).

### 3.5 Run Database Migrations

```bash
# Push database schema
cd apps/api
pnpm db:push

# Optional: Seed initial data (admin user, etc.)
pnpm db:seed
cd ../..
```

### 3.6 Build Applications

```bash
# Build all applications
pnpm build

# Or build individually:
# pnpm build:api
# pnpm build:web
```

---

## 4. Nginx Configuration

### 4.1 Create Initial Nginx Configuration (HTTP Only)

**Important:** We'll start with HTTP-only configuration first, then add SSL certificates later.

```bash
# Create Nginx config file
sudo nano /etc/nginx/sites-available/beehive
```

Add the following configuration (HTTP only - SSL will be added by Certbot):

```nginx
# Upstream for API server
# Note: Using port 4001 to avoid conflicts
upstream api_backend {
    server localhost:4001;
    keepalive 64;
}

# Upstream for Next.js server
# Note: Port 3000 is used by dms-backend, so we use 3001 for Beehive
upstream nextjs_backend {
    server localhost:3001;
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

Save and exit.

### 4.2 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/beehive /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## 5. SSL Certificate Setup

### 5.1 Obtain SSL Certificate

**Important:** Make sure your domain DNS is pointing to your server IP before running Certbot.

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d beehive-lifestyle.info -d www.beehive-lifestyle.info

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

**Note:** Certbot will automatically:
- Obtain the SSL certificates
- Update your Nginx configuration to include SSL
- Add the HTTPS server block
- Set up automatic HTTP to HTTPS redirect (if you choose Yes)

After Certbot completes, your Nginx config will be automatically updated with SSL certificates.

### 5.2 Auto-Renewal Setup

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
# Check with:
sudo systemctl status certbot.timer
```

---

## 6. Check Port Availability

**Important:** Before starting your applications, check if ports 3000 and 4000 are already in use.

```bash
# Check what ports are currently in use
sudo netstat -tulpn | grep LISTEN | grep -E ':(3000|4000)'

# Or use ss command
sudo ss -tulpn | grep -E ':(3000|4000)'

# Check your existing PM2 processes
pm2 describe dms-backend
pm2 describe tree-api
```

**If ports 3000 or 4000 are already in use:**

1. **Option A: Use different ports** (Recommended)
   - If port 3000 is taken, use 3001 for the web app
   - If port 4000 is taken, use 4001 for the API
   - Update `.env`, `ecosystem.config.js`, and Nginx config accordingly

2. **Option B: Stop conflicting processes** (Only if safe)
   ```bash
   pm2 stop dms-backend
   pm2 stop tree-api
   ```

**Example:** If port 3000 is taken (like in your case with `dms-backend`), use port 3001 for Beehive web app.

See `docs/CHECK_PORTS.md` for detailed port checking instructions.

---

## 7. Build Applications

**⚠️ IMPORTANT: You must build both applications before starting them with PM2!**

### 7.1 Build API

```bash
cd /root/projects/beehive/apps/api
pnpm install  # If dependencies aren't installed
pnpm build    # This creates dist/index.js
```

Verify the build:
```bash
ls -la dist/index.js
```

### 7.2 Build Web (Next.js)

**⚠️ IMPORTANT: Make sure `.env` file has `NEXT_PUBLIC_WALLET_CONNECT_ID` set before building!**

```bash
cd /root/projects/beehive/apps/web

# Verify environment variable is set
grep NEXT_PUBLIC_WALLET_CONNECT_ID ../../.env

# If not set, add it to .env file:
# NEXT_PUBLIC_WALLET_CONNECT_ID=bbef8141df63638e7cd94f8b9c098b68

pnpm install  # If dependencies aren't installed
pnpm build    # This creates .next folder
```

Verify the build:
```bash
ls -la .next
```

**Note:** 
- The build process may take a few minutes. 
- `NEXT_PUBLIC_*` environment variables must be set **before** building - they are baked into the build at compile time.
- If you change `NEXT_PUBLIC_*` variables, you must rebuild the frontend.

---

## 8. Start Applications with PM2

### 8.1 Create PM2 Ecosystem File

```bash
# Create PM2 config
cd /root/projects/beehive
nano ecosystem.config.js
```

Add the following (if you're logged in as root, use `/root`):

```javascript
// If logged in as root, use /root. Otherwise use your home directory (e.g., /home/username)
const HOME = process.env.HOME || '/root';

module.exports = {
  apps: [
    {
      name: 'beehive-api',
      cwd: `${HOME}/projects/beehive/apps/api`,
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_PORT: 4001,
      },
      error_file: `${HOME}/projects/beehive/logs/api-error.log`,
      out_file: `${HOME}/projects/beehive/logs/api-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
    {
      name: 'beehive-web',
      cwd: `${HOME}/projects/beehive/apps/web`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,  // Port 3000 is used by dms-backend, so we use 3001
      },
      error_file: `${HOME}/projects/beehive/logs/web-error.log`,
      out_file: `${HOME}/projects/beehive/logs/web-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      error_file: `${HOME}/projects/beehive/logs/web-error.log`,
      out_file: `${HOME}/projects/beehive/logs/web-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};
```

**Note:** If you're logged in as root, `HOME` will be `/root`. Otherwise, replace with your actual home directory path (e.g., `/home/ubuntu`).

Save and exit.

### 8.2 Create Logs Directory

```bash
mkdir -p /root/projects/beehive/logs
```

### 8.3 Start Applications

```bash
# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs
```

---

## 9. DNS Configuration

### 9.1 Configure DNS Records

In your domain registrar's DNS settings, add:

**A Records:**
```
beehive-lifestyle.info     → Your VPS IP address
www.beehive-lifestyle.info → Your VPS IP address
```

**Optional - API Subdomain:**
```
api.beehive-lifestyle.info → Your VPS IP address
```

If you want a separate API subdomain, create another Nginx server block:

```bash
sudo nano /etc/nginx/sites-available/beehive-api
```

```nginx
server {
    listen 443 ssl http2;
    server_name api.beehive-lifestyle.info;

    ssl_certificate /etc/letsencrypt/live/beehive-lifestyle.info/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/beehive-lifestyle.info/privkey.pem;

    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then enable it:
```bash
sudo ln -s /etc/nginx/sites-available/beehive-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. Firewall Configuration

### 10.1 Configure UFW Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 10. Verify Deployment

### 10.1 Check Services

```bash
# Check PM2 processes
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check MySQL
sudo systemctl status mysql

# Check Redis
sudo systemctl status redis-server
```

### 10.2 Test Endpoints

```bash
# Test API health
curl http://localhost:4001/api/health

# Test frontend
curl http://localhost:3001

# Test through Nginx
curl https://beehive-lifestyle.info
```

### 10.3 Check Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/beehive-access.log
sudo tail -f /var/log/nginx/beehive-error.log

# Application logs
tail -f /root/projects/beehive/logs/api-out.log
tail -f /root/projects/beehive/logs/web-out.log
```

---

## 11. Maintenance Commands

### 11.1 Restart Applications

```bash
# Restart all
pm2 restart all

# Restart specific app
pm2 restart beehive-api
pm2 restart beehive-web
```

### 11.2 Update Application

```bash
cd /root/projects/beehive

# Pull latest changes (if using Git)
git pull

# Install dependencies
pnpm install

# Rebuild
pnpm build

# Restart PM2
pm2 restart all
```

### 11.3 Database Backup

```bash
# Create backup
mysqldump -u beehive -p beehive > /var/backups/beehive-$(date +%Y%m%d-%H%M%S).sql

# Restore backup
mysql -u beehive -p beehive < /var/backups/beehive-YYYYMMDD-HHMMSS.sql
```

### 11.4 Monitor Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h
```

---

## 12. Troubleshooting

### 12.1 502 Bad Gateway Error

If you see "502 Bad Gateway" when accessing `/api/*` endpoints:

1. **Check if API server is running:**
   ```bash
   pm2 status
   pm2 logs beehive-api --lines 50
   ```

2. **Verify API is listening on port 4001:**
   ```bash
   sudo netstat -tulpn | grep :4001
   curl http://localhost:4001/api/health
   ```

3. **Check Nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/beehive-error.log
   ```

4. **Restart API server:**
   ```bash
   pm2 restart beehive-api
   ```

See `docs/TROUBLESHOOTING_502.md` for detailed troubleshooting steps.

### 12.2 Application Not Starting

```bash
# Check PM2 logs
pm2 logs beehive-api
pm2 logs beehive-web

# Check if ports are in use
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :4001

# Restart PM2
pm2 restart all
```

### 12.2 500 Internal Server Error (Admin Login)

If you get 500 error when logging into admin panel:

1. **Check API logs for actual error:**
   ```bash
   pm2 logs beehive-api --lines 100
   ```

2. **Verify database tables exist:**
   ```bash
   mysql -u beehive_user -p beehive -e "SHOW TABLES LIKE 'admins';"
   ```

3. **If tables missing, push schema:**
   ```bash
   cd /root/projects/beehive/apps/api
   pnpm db:push
   ```

4. **If no admin users, run seed:**
   ```bash
   pnpm db:seed
   ```

5. **Default admin credentials:**
   - Email: `admin@beehive.io`
   - Password: `admin123`

See `docs/TROUBLESHOOTING_500.md` for detailed troubleshooting.

### 12.3 Database Connection Issues

```bash
# Test MySQL connection
mysql -u beehive_user -p beehive

# Check MySQL status
sudo systemctl status mysql

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### 12.3 Nginx Issues

```bash
# Test Nginx config
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx
sudo systemctl reload nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### 12.4 SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## 13. Security Checklist

- [ ] Change default MySQL root password
- [ ] Use strong JWT secret
- [ ] Enable firewall (UFW)
- [ ] SSL certificate installed and auto-renewing
- [ ] Regular system updates
- [ ] Database backups scheduled
- [ ] PM2 auto-restart enabled
- [ ] Logs rotation configured
- [ ] SSH key authentication (disable password auth)
- [ ] Fail2ban installed (optional but recommended)

---

## 14. Optional: Setup Fail2ban

```bash
# Install Fail2ban
sudo apt install -y fail2ban

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo systemctl status fail2ban
```

---

## 15. Environment Variables Reference

### Production `.env` Template

```env
# Database
DATABASE_URL=mysql://beehive:password@localhost:3306/beehive

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-generated-secret-here

# API
API_PORT=4001
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://beehive-lifestyle.info/api
# OR if using subdomain:
# NEXT_PUBLIC_API_URL=https://api.beehive-lifestyle.info

NEXT_PUBLIC_CHAIN_ID=42161
NEXT_PUBLIC_WALLET_CONNECT_ID=bbef8141df63638e7cd94f8b9c098b68
NEXT_PUBLIC_DOMAIN=https://beehive-lifestyle.info

# Contracts
NEXT_PUBLIC_MEMBERSHIP_CONTRACT=0x...
NEXT_PUBLIC_REWARDS_CONTRACT=0x...
NEXT_PUBLIC_BCC_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_USDT_CONTRACT=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
```

---

## 16. Quick Reference

### Start Services
```bash
pm2 start ecosystem.config.js
sudo systemctl start nginx mysql redis-server
```

### Stop Services
```bash
pm2 stop all
sudo systemctl stop nginx mysql redis-server
```

### View Logs
```bash
pm2 logs
sudo tail -f /var/log/nginx/beehive-access.log
```

### Restart Everything
```bash
pm2 restart all
sudo systemctl restart nginx
```

---

## ✅ Deployment Complete!

Your Beehive application should now be live at:
- **Frontend**: https://beehive-lifestyle.info
- **API**: https://beehive-lifestyle.info/api

If you set up the API subdomain:
- **API**: https://api.beehive-lifestyle.info

---

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/beehive-error.log`
3. Check system resources: `htop`
4. Verify all services are running: `pm2 status` and `sudo systemctl status nginx mysql redis`

---

**Last Updated**: 2024
**Version**: 1.0.0

