# 🐝 Local Setup Guide - XAMPP MySQL + Local Redis

This guide will help you set up MySQL using XAMPP and Redis locally on Windows, instead of using Docker.

---

## 📋 Prerequisites

- ✅ XAMPP installed (Download from https://www.apachefriends.org/)
- ✅ Windows 10/11
- ✅ Node.js and pnpm installed

---

## 🗄️ Step 1: Setup XAMPP MySQL

### 1.1 Install XAMPP
1. Download XAMPP from https://www.apachefriends.org/
2. Install it (default location: `C:\xampp`)
3. Open **XAMPP Control Panel**

### 1.2 Start MySQL Service
1. In XAMPP Control Panel, click **Start** next to MySQL
2. Wait until it shows "Running" (green)
3. MySQL is now running on **port 3306**

### 1.3 Create Database
1. Open **phpMyAdmin** (click "Admin" button next to MySQL, or go to http://localhost/phpmyadmin)
2. Click **"New"** in the left sidebar
3. Database name: `beehive`
4. Collation: `utf8mb4_unicode_ci`
5. Click **"Create"**

### 1.4 Create Database User (Optional but Recommended)
1. In phpMyAdmin, click **"User accounts"** tab
2. Click **"Add user account"**
3. Fill in:
   - **Username**: `beehive`
   - **Host name**: `localhost`
   - **Password**: `password` (or your preferred password)
   - **Privileges**: Select **"Grant all privileges on database 'beehive'"**
4. Click **"Go"**

### 1.5 Test Connection
You can test the connection using MySQL Workbench or command line:
```bash
mysql -u root -p
# Or if you created a user:
mysql -u beehive -p
```

---

## 🔴 Step 2: Setup Local Redis (Windows)

### Option A: Using Memurai (Recommended for Windows)

**Memurai** is a Redis-compatible server for Windows.

1. **Download Memurai**:
   - Go to https://www.memurai.com/
   - Download the free Developer Edition
   - Install it

2. **Start Memurai**:
   - Memurai runs as a Windows service automatically
   - Check if it's running: Open Services (Win+R → `services.msc`) → Look for "Memurai"

3. **Test Redis Connection**:
   ```bash
   # Install redis-cli if needed
   npm install -g redis-cli
   
   # Or use Memurai's built-in client
   redis-cli ping
   # Should return: PONG
   ```

### Option B: Using WSL2 (Windows Subsystem for Linux)

If you have WSL2 installed:

1. **Open WSL Terminal**:
   ```bash
   wsl
   ```

2. **Install Redis**:
   ```bash
   sudo apt update
   sudo apt install redis-server
   ```

3. **Start Redis**:
   ```bash
   sudo service redis-server start
   ```

4. **Test**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Option C: Using Docker (Just Redis)

If you only want Redis in Docker:

1. **Update docker-compose.yml** (keep only Redis):
   ```yaml
   services:
     redis:
       image: redis:7-alpine
       container_name: beehive-redis
       ports:
         - "6379:6379"
   ```

2. **Start only Redis**:
   ```bash
   docker-compose up -d redis
   ```

---

## ⚙️ Step 3: Configure Your Project

### 3.1 Create Environment File

Create `apps/api/.env` file:

```env
# Database (XAMPP MySQL)
DATABASE_URL=mysql://root:@localhost:3306/beehive
# Or if you created a user:
# DATABASE_URL=mysql://beehive:password@localhost:3306/beehive

# Redis (Local)
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Port
API_PORT=4000

# Node Environment
NODE_ENV=development
```

### 3.2 Update docker-compose.yml

Comment out MySQL and Redis services (we're using local ones):

```yaml
version: '3.8'

services:
  # MySQL Database - DISABLED (Using XAMPP)
  # mysql:
  #   image: mysql:8.0
  #   container_name: beehive-mysql
  #   ...

  # Redis Cache - DISABLED (Using Local Redis)
  # redis:
  #   image: redis:7-alpine
  #   container_name: beehive-redis
  #   ...

  # API Server (Development) - DISABLED (Run with pnpm dev)
  # api:
  #   ...

  # Web Frontend (Development) - DISABLED (Run with pnpm dev)
  # web:
  #   ...

volumes:
  # mysql_data:
  #   driver: local
  # redis_data:
  #   driver: local
```

---

## 🚀 Step 4: Setup Database Schema

### 4.1 Push Database Schema

```bash
cd apps/api
pnpm db:push
```

This will create all 25 tables in your XAMPP MySQL database.

### 4.2 Seed Initial Data

```bash
pnpm db:seed
```

This creates:
- Master Admin role
- Operation role
- Support role
- Default admin users

---

## ✅ Step 5: Verify Setup

### 5.1 Check MySQL Connection

```bash
cd apps/api
node -e "const mysql = require('mysql2/promise'); (async () => { const conn = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/beehive'); console.log('✅ MySQL connected!'); await conn.end(); })()"
```

### 5.2 Check Redis Connection

```bash
cd apps/api
node -e "const Redis = require('ioredis'); const redis = new Redis('redis://localhost:6379'); redis.ping().then(() => { console.log('✅ Redis connected!'); process.exit(0); }).catch(err => { console.error('❌ Redis error:', err); process.exit(1); });"
```

### 5.3 Start API Server

```bash
cd apps/api
pnpm dev
```

You should see:
```
✅ Database connected
✅ Redis connected
🚀 API server running on http://localhost:4000
```

---

## 🎯 Step 6: Start Development

### 6.1 Start API

```bash
cd apps/api
pnpm dev
```

### 6.2 Start Web (New Terminal)

```bash
cd apps/web
pnpm dev
```

### 6.3 Access Your App

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **phpMyAdmin**: http://localhost/phpmyadmin

---

## 🔧 Troubleshooting

### MySQL Connection Failed

**Error**: `ECONNREFUSED` or `Access denied`

**Solutions**:
1. Make sure XAMPP MySQL is running (green in XAMPP Control Panel)
2. Check if port 3306 is in use:
   ```bash
   netstat -ano | findstr :3306
   ```
3. Verify database exists in phpMyAdmin
4. Check username/password in `.env` file
5. Try using `root` user with empty password:
   ```env
   DATABASE_URL=mysql://root:@localhost:3306/beehive
   ```

### Redis Connection Failed

**Error**: `ECONNREFUSED` or `Redis connection error`

**Solutions**:
1. **If using Memurai**: Check if service is running in Windows Services
2. **If using WSL**: Make sure Redis is started:
   ```bash
   wsl
   sudo service redis-server start
   ```
3. **If using Docker**: Make sure container is running:
   ```bash
   docker ps | grep redis
   ```
4. Test connection manually:
   ```bash
   redis-cli ping
   ```

### Port Already in Use

**Error**: `Port 3306 already in use` or `Port 6379 already in use`

**Solutions**:
1. Check what's using the port:
   ```bash
   netstat -ano | findstr :3306
   netstat -ano | findstr :6379
   ```
2. Stop the conflicting service
3. Or change the port in XAMPP/Redis configuration

---

## 📝 Quick Reference

### XAMPP MySQL
- **Default Port**: 3306
- **Default User**: `root` (no password)
- **phpMyAdmin**: http://localhost/phpmyadmin
- **Start/Stop**: XAMPP Control Panel

### Local Redis
- **Default Port**: 6379
- **Memurai**: Runs as Windows service
- **WSL Redis**: `sudo service redis-server start`
- **Test**: `redis-cli ping`

### Environment Variables
```env
DATABASE_URL=mysql://root:@localhost:3306/beehive
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### Common Commands
```bash
# Push database schema
cd apps/api && pnpm db:push

# Seed database
cd apps/api && pnpm db:seed

# Start API
cd apps/api && pnpm dev

# Start Web
cd apps/web && pnpm dev
```

---

## 🎊 You're All Set!

Your local development environment is now configured with:
- ✅ XAMPP MySQL (local)
- ✅ Local Redis
- ✅ No Docker needed for database/cache

**Happy coding!** 🚀🐝

