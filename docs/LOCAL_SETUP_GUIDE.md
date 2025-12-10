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

# Hardhat Local Deployer (DO NOT USE IN PRODUCTION)
# This is Hardhat's default test account #0
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PLATFORM_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

> ⚠️ **Note**: The private key above is Hardhat's default test account. Never use it with real funds!

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

## 5. Smart Contract Deployment (Local)

### Step 5.1: Install Contract Dependencies

```powershell
cd contracts
npm install
```

### Step 5.2: Start Hardhat Local Node

Open a **new terminal window** and run:

```powershell
cd C:\Users\User\Desktop\Website\beehive\contracts
npx hardhat node
```

Keep this terminal running! You'll see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

### Step 5.3: Create Mock USDT Contract

Create a new file `contracts/src/MockUSDT.sol`:

```powershell
# In original terminal
cd contracts
```

Create the file with this content:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        // Mint 1 million USDT to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Faucet function for testing
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

### Step 5.4: Update Deploy Script for Local

Update `contracts/scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🐝 Deploying Beehive contracts locally...");
  console.log("Deployer:", deployer.address);

  // Step 1: Deploy Mock USDT
  console.log("\n1️⃣ Deploying MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const usdtAddress = await mockUSDT.getAddress();
  console.log("✅ MockUSDT deployed to:", usdtAddress);

  // Step 2: Deploy BCC Token
  console.log("\n2️⃣ Deploying BCCToken...");
  const BCCToken = await ethers.getContractFactory("BCCToken");
  const bccToken = await BCCToken.deploy();
  await bccToken.waitForDeployment();
  const bccAddress = await bccToken.getAddress();
  console.log("✅ BCCToken deployed to:", bccAddress);

  // Step 3: Deploy BeehiveMembership
  console.log("\n3️⃣ Deploying BeehiveMembership...");
  const platformWallet = deployer.address;
  const baseURI = "http://localhost:3000/api/metadata/";
  
  const BeehiveMembership = await ethers.getContractFactory("BeehiveMembership");
  const membership = await BeehiveMembership.deploy(usdtAddress, platformWallet, baseURI);
  await membership.waitForDeployment();
  const membershipAddress = await membership.getAddress();
  console.log("✅ BeehiveMembership deployed to:", membershipAddress);

  // Step 4: Deploy BeehiveRewards
  console.log("\n4️⃣ Deploying BeehiveRewards...");
  const BeehiveRewards = await ethers.getContractFactory("BeehiveRewards");
  const rewards = await BeehiveRewards.deploy(usdtAddress);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("✅ BeehiveRewards deployed to:", rewardsAddress);

  // Step 5: Link contracts
  console.log("\n5️⃣ Linking contracts...");
  
  await membership.setRewardsContract(rewardsAddress);
  console.log("✅ Membership.setRewardsContract done");

  await rewards.setMembershipContract(membershipAddress);
  console.log("✅ Rewards.setMembershipContract done");

  await rewards.setBCCToken(bccAddress);
  console.log("✅ Rewards.setBCCToken done");

  await bccToken.addMinter(rewardsAddress);
  console.log("✅ BCCToken.addMinter done");

  // Step 6: Fund rewards contract with USDT for payouts
  console.log("\n6️⃣ Funding contracts for testing...");
  await mockUSDT.transfer(rewardsAddress, ethers.parseUnits("100000", 6));
  console.log("✅ Transferred 100,000 USDT to rewards contract");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 LOCAL DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📝 Contract Addresses (update your .env):");
  console.log(`NEXT_PUBLIC_USDT_CONTRACT=${usdtAddress}`);
  console.log(`NEXT_PUBLIC_BCC_TOKEN_CONTRACT=${bccAddress}`);
  console.log(`NEXT_PUBLIC_MEMBERSHIP_CONTRACT=${membershipAddress}`);
  console.log(`NEXT_PUBLIC_REWARDS_CONTRACT=${rewardsAddress}`);
  
  console.log("\n💡 To get test USDT, call mockUSDT.faucet(yourAddress, amount)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
```

### Step 5.5: Deploy Contracts Locally

In a new terminal (keep Hardhat node running):

```powershell
cd C:\Users\User\Desktop\Website\beehive\contracts
npx hardhat run scripts/deploy.ts --network localhost
```

You'll see output like:
```
🎉 LOCAL DEPLOYMENT COMPLETE!
============================================================

📝 Contract Addresses (update your .env):
NEXT_PUBLIC_USDT_CONTRACT=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_BCC_TOKEN_CONTRACT=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_MEMBERSHIP_CONTRACT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_REWARDS_CONTRACT=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### Step 5.6: Update .env with Contract Addresses

Copy the addresses from the output and update your `.env` file.

---

## 6. Start Development Servers

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

### Step 7.1: Add Hardhat Network to MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add network manually"
3. Enter:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
4. Click "Save"

### Step 7.2: Import Test Account to MetaMask

1. In MetaMask, click account icon → "Import Account"
2. Select "Private Key"
3. Paste: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
4. Click "Import"

This account has 10,000 ETH and 1,000,000 test USDT!

### Step 7.3: Get Test USDT (If Needed)

If you need more test USDT, use Hardhat console:

```powershell
cd contracts
npx hardhat console --network localhost
```

Then run:
```javascript
const USDT = await ethers.getContractFactory("MockUSDT");
const usdt = USDT.attach("YOUR_USDT_CONTRACT_ADDRESS");
await usdt.faucet("YOUR_WALLET_ADDRESS", ethers.parseUnits("10000", 6));
```

### Step 7.4: Test the Flow

1. Open http://localhost:3000
2. Click "Connect Wallet" and connect with MetaMask
3. Switch to "Hardhat Local" network in MetaMask
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

### Issue: Hardhat node disconnects

If the Hardhat node terminal closes, redeploy contracts:
```powershell
cd contracts
npx hardhat node
# In another terminal:
npx hardhat run scripts/deploy.ts --network localhost
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
| Hardhat Node | http://127.0.0.1:8545 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

---

## 🔄 Daily Development Workflow

```powershell
# Terminal 1: Start Docker services
docker-compose up -d mysql redis

# Terminal 2: Start Hardhat node (if testing contracts)
cd contracts && npx hardhat node

# Terminal 3: Deploy contracts (only if Hardhat restarted)
cd contracts && npx hardhat run scripts/deploy.ts --network localhost

# Terminal 4: Start API
cd apps/api && pnpm dev

# Terminal 5: Start Frontend
cd apps/web && pnpm dev
```

---

## 🛑 Stopping Everything

```powershell
# Stop Docker containers
docker-compose down

# Stop Hardhat node: Ctrl+C in its terminal
# Stop API: Ctrl+C in its terminal
# Stop Frontend: Ctrl+C in its terminal
```

---

Happy coding! 🐝

