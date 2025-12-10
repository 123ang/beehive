# 🐝 Beehive Platform

A revolutionary Web3 membership and rewards platform built on Arbitrum. Features 19 membership levels, NFT-based membership, BCC token rewards, and a 3×3 matrix referral system.

![Beehive Platform](https://img.shields.io/badge/Web3-Membership-gold)
![Arbitrum](https://img.shields.io/badge/Arbitrum-One-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

## ✨ Features

- **19 Membership Levels** - From Warrior ($130) to Mythic Apex ($1000)
- **NFT Membership** - ERC-1155 based membership tokens
- **BCC Token Rewards** - Earn BCC tokens with every level purchase
- **3×3 Forced Matrix** - Fair distribution referral system
- **Layer Rewards** - Earn from your network up to 19 layers deep
- **Direct Sponsor Rewards** - $100 USDT for each Level 1 referral
- **Instant Payouts** - No waiting, rewards distributed automatically
- **Beautiful Dark UI** - Honeycomb-themed design with animations

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18 |
| **Styling** | Tailwind CSS, Framer Motion |
| **Web3** | wagmi v2, viem, RainbowKit |
| **Backend** | Hono.js (4x faster than Express) |
| **ORM** | Drizzle ORM |
| **Database** | MySQL 8.0 |
| **Cache** | Redis |
| **Smart Contracts** | Solidity, Hardhat |
| **Blockchain** | Arbitrum One |

## 📁 Project Structure

```
beehive/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── page.tsx           # Home
│   │   │   │   ├── membership/        # Membership levels
│   │   │   │   ├── dashboard/         # User dashboard
│   │   │   │   ├── rewards/           # Rewards history
│   │   │   │   ├── referrals/         # Referral management
│   │   │   │   ├── profile/           # User profile
│   │   │   │   └── admin/             # Admin panel
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Reusable UI components
│   │   │   │   ├── web3/       # Web3 components
│   │   │   │   ├── home/       # Home page sections
│   │   │   │   └── layout/     # Layout components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   └── lib/            # Utilities & configs
│   │   └── package.json
│   │
│   └── api/                    # Hono.js backend
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── services/       # Business logic
│       │   ├── middleware/     # Auth, rate limiting
│       │   ├── db/             # Database schema
│       │   └── lib/            # Utilities
│       └── package.json
│
├── contracts/                  # Solidity smart contracts
│   ├── src/
│   │   ├── BCCToken.sol        # ERC-20 BCC token
│   │   ├── BeehiveMembership.sol   # ERC-1155 membership
│   │   └── BeehiveRewards.sol  # Reward distribution
│   └── scripts/
│       └── deploy.ts           # Deployment script
│
├── packages/
│   └── shared/                 # Shared types & constants
│
├── docker-compose.yml          # Local development stack
├── nginx.conf                  # Production nginx config
├── ecosystem.config.js         # PM2 production config
└── scripts/
    └── setup.sh                # VPS setup script
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for local development)

### Installation

```bash
# Clone the repository
git clone https://github.com/your/beehive.git
cd beehive

# Install dependencies
pnpm install

# Start Docker services (MySQL + Redis)
docker-compose up -d mysql redis

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

> 📖 For detailed setup instructions, see [docs/LOCAL_SETUP_GUIDE.md](docs/LOCAL_SETUP_GUIDE.md)

**URLs:**
- Frontend: http://localhost:3000
- API: http://localhost:4000
- API Health: http://localhost:4000/api/health

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database (MySQL)
DATABASE_URL=mysql://beehive:password@localhost:3306/beehive

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Web3
NEXT_PUBLIC_WALLET_CONNECT_ID=your-wallet-connect-project-id
NEXT_PUBLIC_CHAIN_ID=42161

# Contract Addresses (update after deployment)
NEXT_PUBLIC_MEMBERSHIP_CONTRACT=0x...
NEXT_PUBLIC_REWARDS_CONTRACT=0x...
NEXT_PUBLIC_BCC_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_USDT_CONTRACT=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9

# API
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 📄 Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Landing page with features and level preview |
| Membership | `/membership` | All 19 levels with purchase functionality |
| Dashboard | `/dashboard` | User stats, earnings, and quick actions |
| Rewards | `/rewards` | Reward history with filtering |
| Referrals | `/referrals` | Referral link, QR code, and referral list |
| Profile | `/profile` | User settings and NFT badges |
| Admin | `/admin` | Platform statistics and member management |

## 🎨 UI Components

### Core Components
- `Button` - Primary, secondary, outline, ghost variants
- `Card` - Glass, gradient, and default styles
- `Modal` - Animated modal with backdrop
- `Toast` - Success, error, warning, info notifications
- `Progress` - Linear and circular progress bars
- `Skeleton` - Loading placeholders

### Web3 Components
- `PurchaseModal` - Full purchase flow with approval
- `ClaimRewardsButton` - One-click reward claiming
- `WalletInfo` - Connected wallet overview

### Animation Components
- `AnimatedCounter` - Counting animation with easing
- `HexagonGrid` - Animated honeycomb pattern
- `GlowingCard` - Mouse-follow glow effect

## 🔗 Smart Contracts

### Deployment

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:sepolia

# Deploy to mainnet
npm run deploy:mainnet
```

### Contract Architecture

```
┌─────────────────────────────────────────────────┐
│                  BCCToken.sol                   │
│                   (ERC-20)                      │
│  • mint()  • burn()  • addMinter()              │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│             BeehiveMembership.sol               │
│                  (ERC-1155)                     │
│  • purchaseLevel()  • setRewardsContract()      │
│  • memberLevel()    • directSponsorReward()     │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              BeehiveRewards.sol                 │
│            (Reward Distribution)                │
│  • claimRewards()  • distributeReward()         │
│  • processLayerReward()  • batchDistribute()    │
└─────────────────────────────────────────────────┘
```

## 📊 Membership Levels

| Level | Name | Price (USDT) | BCC Reward |
|-------|------|--------------|------------|
| 1 | Warrior | $130 | 500 |
| 2 | Bronze | $150 | 100 |
| 3 | Silver | $200 | 200 |
| 4 | Gold | $250 | 300 |
| 5 | Elite | $300 | 400 |
| 6 | Platinum | $350 | 500 |
| 7 | Master | $400 | 600 |
| 8 | Diamond | $450 | 700 |
| 9 | Grandmaster | $500 | 800 |
| 10 | Starlight | $550 | 900 |
| 11 | Epic | $600 | 1,000 |
| 12 | Legend | $650 | 1,100 |
| 13 | Supreme King | $700 | 1,200 |
| 14 | Peerless King | $750 | 1,300 |
| 15 | Glory King | $800 | 1,400 |
| 16 | Legendary | $850 | 1,500 |
| 17 | Supreme | $900 | 1,600 |
| 18 | Mythic | $950 | 900 |
| 19 | Mythic Apex | $1,000 | 1,950 |

## 💰 Reward System

### Direct Sponsor Reward
- **Amount:** $100 USDT
- **Trigger:** When a referred member purchases Level 1
- **Status:** Instant (if sponsor is Level 1+) or Pending

### Layer Rewards
- **Range:** Levels 2-19
- **Amount:** Matches the level price
- **Depth:** Up to 19 layers deep in your network
- **Expiry:** Pending rewards expire after 72 hours

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/nonce     - Get SIWE nonce
POST /api/auth/verify    - Verify signature, get JWT
GET  /api/auth/me        - Get current user
```

### Members
```
GET  /api/members/dashboard  - Dashboard stats
GET  /api/members/tree       - Matrix tree structure
GET  /api/members/layers     - Layer statistics
GET  /api/members/rewards    - Reward history
GET  /api/members/referral   - Referral info
POST /api/members/register   - Register after purchase
```

### Admin
```
GET  /api/admin/stats              - Platform statistics
GET  /api/admin/members            - All members
GET  /api/admin/members/:wallet    - Member details
GET  /api/admin/rewards/pending    - Pending rewards
POST /api/admin/rewards/distribute - Manual distribution
POST /api/admin/rewards/process-expired - Process expired
```

## 🚢 Production Deployment

### VPS Setup

```bash
# Run the setup script on a fresh Ubuntu 22.04 VPS
sudo ./scripts/setup.sh
```

### Deploy

```bash
# Clone to production server
cd /var/www/beehive
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm build

# Run migrations
pnpm db:migrate

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx & SSL

```bash
# Link nginx config
sudo ln -s /var/www/beehive/nginx.conf /etc/nginx/sites-available/beehive
sudo ln -s /etc/nginx/sites-available/beehive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🧪 Development Scripts

```bash
# Start all services
pnpm dev

# Start specific app
pnpm dev:web    # Frontend only
pnpm dev:api    # API only

# Build
pnpm build

# Database
pnpm db:generate   # Generate migrations
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Drizzle Studio

# Contracts
cd contracts
npm run compile    # Compile contracts
npm run test       # Run tests
```

## 📦 Dependencies

### Frontend
- `next` - React framework
- `wagmi` + `viem` - Web3 integration
- `@rainbow-me/rainbowkit` - Wallet connection
- `framer-motion` - Animations
- `tailwindcss` - Styling
- `lucide-react` - Icons

### Backend
- `hono` - Web framework
- `drizzle-orm` - Database ORM
- `mysql2` - MySQL driver
- `ioredis` - Redis client
- `jose` - JWT handling
- `zod` - Validation

### Contracts
- `@openzeppelin/contracts` - Secure contract library
- `hardhat` - Development framework

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Arbitrum team for the L2 solution
- RainbowKit for the beautiful wallet connection

---

<p align="center">
  Built with 🐝 by the Beehive Team
</p>
