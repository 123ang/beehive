# 🐝 Beehive Local Development Setup Guide

This guide will walk you through setting up the Beehive platform on your local machine for development and testing.

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [Smart Contract Deployment (Local)](#5-smart-contract-deployment-local)
6. [Start Development Servers](#6-start-development-servers)
7. [Testing the Application](#7-testing-the-application)
8. [Common Issues & Solutions](#8-common-issues--solutions)

---

## 1. Prerequisites

### Required Software

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 20.x or higher | https://nodejs.org/ |
| pnpm | 8.x or higher | `npm install -g pnpm` |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop/ |
| Git | Latest | https://git-scm.com/ |

### Recommended Tools

| Tool | Purpose |
|------|---------|
| VS Code | Code editor |
| MySQL Workbench | Database GUI (optional) |
| Postman | API testing (optional) |

### Verify Installation

Open your terminal and run:

```powershell
# Check Node.js
node --version
# Expected: v20.x.x or higher

# Check pnpm
pnpm --version
# Expected: 8.x.x or higher

# Check Docker
docker --version
# Expected: Docker version 24.x.x or higher

# Check Git
git --version
```

---

## 2. Project Setup

### Step 2.1: Navigate to Project Directory

```powershell
cd C:\Users\User\Desktop\Website\beehive
```

### Step 2.2: Install Dependencies

```powershell
# Install all workspace dependencies
pnpm install
```

This will install dependencies for:
- Root workspace
- `apps/web` (Next.js frontend)
- `apps/api` (Hono.js backend)
- `packages/shared` (Shared types)
- `contracts` (Solidity contracts)

### Step 2.3: Build Shared Package

```powershell
# Build the shared package first
cd packages/shared
pnpm build
cd ../..
```

---

## 3. Environment Configuration

### Step 3.1: Create Environment File

Create a `.env` file in the project root:

```powershell
# Create .env file (Windows PowerShell)
New-Item -Path ".env" -ItemType File
```

### Step 3.2: Add Environment Variables

Open `.env` in your editor and add:

```env
# ============================================
# BEEHIVE LOCAL DEVELOPMENT CONFIGURATION
# ============================================

# Database (MySQL)
DATABASE_URL=mysql://beehive:password@localhost:3306/beehive
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_USER=beehive
MYSQL_PASSWORD=password
MYSQL_DATABASE=beehive

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret (use any random string for local dev)
JWT_SECRET=local-development-secret-key-change-in-production

# API Configuration
API_PORT=4000
NODE_ENV=development

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CHAIN_ID=31337

# WalletConnect (get free ID at https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLET_CONNECT_ID=your-project-id

# Contract Addresses (will be updated after local deployment)
NEXT_PUBLIC_MEMBERSHIP_CONTRACT=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_REWARDS_CONTRACT=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_BCC_TOKEN_CONTRACT=0x0000000000000000000000000000000000000000

# Local USDT Mock (will be deployed locally)
NEXT_PUBLIC_USDT_CONTRACT=0x0000000000000000000000000000000000000000

# Platform wallet (optional, for contract deployment)
PLATFORM_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

---

## 4. Database Setup

### Step 4.1: Start Docker Services

```powershell
# Start MySQL and Redis containers
docker-compose up -d mysql redis
```

### Step 4.2: Verify Services are Running

```powershell
# Check container status
docker ps
```

You should see:
```
CONTAINER ID   IMAGE          STATUS         PORTS
xxxx           mysql:8.0      Up X seconds   0.0.0.0:3306->3306/tcp
xxxx           redis:7-alpine Up X seconds   0.0.0.0:6379->6379/tcp
```

### Step 4.3: Wait for MySQL to Initialize

```powershell
# Wait about 30 seconds, then check MySQL logs
docker logs beehive-mysql
```

Look for: `ready for connections`

### Step 4.4: Run Database Migrations

```powershell
# Option 1: Push schema directly to database (quick setup)
cd apps/api
pnpm db:push
cd ../..

# Option 2: Generate and apply migrations (recommended for production)
cd apps/api
pnpm db:generate
pnpm db:migrate
cd ../..
```

### Step 4.5: Verify Database (Optional)

Connect to MySQL:

```powershell
docker exec -it beehive-mysql mysql -u beehive -ppassword beehive
```

Then run:
```sql
SHOW TABLES;
-- You should see: users, members, rewards, transactions, etc.

EXIT;
```

---

## 5. Start Development Servers

### Step 6.1: Start API Server

Open a **new terminal**:

```powershell
cd C:\Users\User\Desktop\Website\beehive\apps\api
pnpm dev
```

You should see:
```
🐝 ================================================
   BEEHIVE API SERVER
   ================================================
   
   Port: 4000
   Environment: development
```

### Step 6.2: Start Frontend

Open another **new terminal**:

```powershell
cd C:\Users\User\Desktop\Website\beehive\apps\web
pnpm dev
```

You should see:
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
```

---

## 7. Testing the Application

### Step 7.1: Test the Flow

1. Open http://localhost:3000
2. Click "Connect Wallet" and connect with MetaMask
3. Switch to your configured network (BSC Testnet or Mainnet) in MetaMask
4. Go to "Membership" page
5. Try purchasing Level 1 ($130 USDT)
6. Approve the USDT spending
7. Confirm the purchase transaction
8. Check your Dashboard for the new membership!

---

## 8. Common Issues & Solutions

### Issue: Docker containers won't start

```powershell
# Stop all containers
docker-compose down

# Remove volumes and restart
docker-compose down -v
docker-compose up -d mysql redis
```

### Issue: "Cannot connect to MySQL"

Wait 30-60 seconds after starting Docker. Check logs:
```powershell
docker logs beehive-mysql
```


### Issue: MetaMask shows wrong nonce

Reset MetaMask account:
1. Settings → Advanced → Clear activity tab data

### Issue: "Transaction reverted"

Check if:
1. You have enough test ETH for gas
2. You have enough test USDT for the purchase
3. USDT is approved for the Membership contract

### Issue: API returns 500 error

Check if:
1. MySQL is running: `docker ps`
2. Redis is running: `docker ps`
3. Environment variables are correct

---

## 📊 Development URLs Summary

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| API Health | http://localhost:4000/api/health |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

---

## 🔄 Daily Development Workflow

```powershell
# Terminal 1: Start Docker services
docker-compose up -d mysql redis

# Terminal 2: Start API
cd apps/api && pnpm dev

# Terminal 3: Start Frontend
cd apps/web && pnpm dev
```

---

## 🛑 Stopping Everything

```powershell
# Stop Docker containers
docker-compose down

# Stop API: Ctrl+C in its terminal
# Stop Frontend: Ctrl+C in its terminal
```

---

Happy coding! 🐝

