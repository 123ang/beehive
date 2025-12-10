# 🐝 BEEHIVE 统一架构方案

> 全部自托管，单一 VPS，自定义智能合约

---

## 📋 目录

1. [推荐技术栈](#1-推荐技术栈)
2. [系统架构](#2-系统架构)
3. [智能合约 (Solidity)](#3-智能合约)
4. [后端 API](#4-后端-api)
5. [数据库设计](#5-数据库设计)
6. [前端](#6-前端)
7. [VPS 部署](#7-vps-部署)
8. [开发流程](#8-开发流程)

---

## 1. 推荐技术栈

### 🎯 推荐方案 (现代 + 高性能)

| 层级 | 技术 | 理由 |
|------|------|------|
| **前端** | Next.js 14 (App Router) | SSR/SSG, 更好SEO, API Routes 内置 |
| **样式** | Tailwind CSS + shadcn/ui | 快速开发，美观组件 |
| **Web3** | wagmi v2 + viem | 更轻量，TypeScript 原生支持 |
| **钱包** | RainbowKit / ConnectKit | 开源，免费，美观 |
| **后端** | Hono.js | 超快 (比 Express 快 4x)，TypeScript 原生 |
| **ORM** | Drizzle ORM | 类型安全，性能好，轻量 |
| **数据库** | PostgreSQL | 可靠，支持 JSON，免费 |
| **缓存** | Redis | 会话管理，缓存查询 |
| **智能合约** | Solidity + Hardhat | 本地测试，自动验证 |
| **部署** | Remix IDE → Arbitrum | 免费部署 |
| **进程管理** | PM2 | 进程守护，自动重启 |
| **反向代理** | Nginx + Certbot | SSL, 负载均衡 |

### 🔄 备选方案 (更简单)

| 层级 | 技术 | 理由 |
|------|------|------|
| **全栈** | Next.js 14 | 前后端一体 |
| **数据库** | SQLite (better-sqlite3) | 零配置，单文件 |
| **Web3** | ethers.js v6 | 成熟稳定 |

---

## 2. 系统架构

### 2.1 统一架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VPS (Ubuntu 22.04)                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         Nginx (Port 80/443)                   │  │
│  │  SSL Termination + Reverse Proxy + Static Files              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                  │                                   │
│          ┌───────────────────────┴───────────────────────┐          │
│          ▼                                               ▼          │
│  ┌───────────────────┐                     ┌───────────────────┐   │
│  │  Next.js App      │                     │  Hono.js API      │   │
│  │  (Port 3000)      │ ◄────────────────► │  (Port 4000)      │   │
│  │                   │      HTTP/JSON      │                   │   │
│  │  - Pages/Routes   │                     │  - Auth API       │   │
│  │  - SSR/SSG        │                     │  - User API       │   │
│  │  - Web3 UI        │                     │  - Rewards API    │   │
│  │  - wagmi + viem   │                     │  - Matrix API     │   │
│  └───────────────────┘                     │  - Admin API      │   │
│                                            │  - Webhook        │   │
│                                            └─────────┬─────────┘   │
│                                                      │              │
│                    ┌─────────────────────────────────┼──────────┐  │
│                    ▼                                 ▼          │  │
│          ┌───────────────────┐             ┌───────────────────┐│  │
│          │  PostgreSQL       │             │  Redis            ││  │
│          │  (Port 5432)      │             │  (Port 6379)      ││  │
│          │                   │             │                   ││  │
│          │  - users          │             │  - sessions       ││  │
│          │  - members        │             │  - cache          ││  │
│          │  - rewards        │             │  - rate limit     ││  │
│          │  - transactions   │             │                   ││  │
│          │  - matrix_tree    │             └───────────────────┘│  │
│          └───────────────────┘                                  │  │
│                                                                 │  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Arbitrum One Blockchain                      │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │ BeehiveMembership │  │ BeehiveRewards    │  │ BCC Token       │ │
│  │ (ERC-1155)        │  │ (Custom)          │  │ (ERC-20)        │ │
│  │                   │  │                   │  │                 │ │
│  │ - mint()          │  │ - claimReward()   │  │ - mint()        │ │
│  │ - setPrice()      │  │ - distributeLayer │  │ - transfer()    │ │
│  │ - withdraw()      │  │ - withdraw()      │  │ - burn()        │ │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
beehive/
├── apps/
│   ├── web/                    # Next.js 前端
│   │   ├── app/                # App Router
│   │   │   ├── (auth)/         # 认证相关页面
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/    # 用户仪表盘
│   │   │   │   ├── dashboard/
│   │   │   │   ├── membership/
│   │   │   │   ├── rewards/
│   │   │   │   ├── referrals/
│   │   │   │   └── profile/
│   │   │   ├── (admin)/        # 管理后台
│   │   │   │   └── admin/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        # 首页
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui 组件
│   │   │   ├── web3/           # Web3 组件
│   │   │   ├── membership/     # 会员组件
│   │   │   └── rewards/        # 奖励组件
│   │   ├── lib/
│   │   │   ├── wagmi.ts        # Web3 配置
│   │   │   ├── contracts.ts    # 合约 ABI
│   │   │   └── api.ts          # API 客户端
│   │   └── package.json
│   │
│   └── api/                    # Hono.js 后端
│       ├── src/
│       │   ├── index.ts        # 入口
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   ├── members.ts
│       │   │   ├── rewards.ts
│       │   │   ├── matrix.ts
│       │   │   └── admin.ts
│       │   ├── services/
│       │   │   ├── RewardService.ts
│       │   │   ├── MatrixService.ts
│       │   │   └── BlockchainService.ts
│       │   ├── db/
│       │   │   ├── schema.ts   # Drizzle schema
│       │   │   └── index.ts    # DB connection
│       │   └── middleware/
│       │       ├── auth.ts
│       │       └── rateLimit.ts
│       └── package.json
│
├── contracts/                  # Solidity 智能合约
│   ├── BeehiveMembership.sol
│   ├── BeehiveRewards.sol
│   ├── BCCToken.sol
│   └── deploy/
│       └── deploy.ts
│
├── packages/
│   └── shared/                 # 共享类型和常量
│       ├── types.ts
│       └── constants.ts
│
├── docker-compose.yml          # PostgreSQL + Redis
├── nginx.conf                  # Nginx 配置
├── ecosystem.config.js         # PM2 配置
└── package.json                # Monorepo root
```

---

## 3. 智能合约

### 3.1 BeehiveMembership.sol (ERC-1155 会员 NFT)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BeehiveMembership is ERC1155, Ownable, ReentrancyGuard {
    
    // 等级定义 (Token ID 1-19)
    struct Level {
        uint256 priceUSDT;      // USDT 价格 (6 decimals)
        uint256 bccReward;       // BCC 代币奖励
        string name;             // 等级名称
        bool active;             // 是否激活
    }
    
    mapping(uint256 => Level) public levels;
    mapping(address => uint256) public memberLevel;  // 用户当前等级
    mapping(address => address) public referrer;     // 推荐人
    
    IERC20 public usdtToken;
    address public platformWallet;
    address public rewardsContract;
    
    uint256 public constant MAX_LEVEL = 19;
    uint256 public directSponsorReward = 100 * 1e6;  // 100 USDT
    
    event MembershipPurchased(
        address indexed buyer,
        uint256 level,
        address indexed referrer,
        uint256 amount
    );
    event LevelUpgraded(address indexed member, uint256 fromLevel, uint256 toLevel);
    event DirectSponsorPaid(address indexed sponsor, address indexed buyer, uint256 amount);
    
    constructor(
        address _usdtToken,
        address _platformWallet,
        string memory _uri
    ) ERC1155(_uri) Ownable(msg.sender) {
        usdtToken = IERC20(_usdtToken);
        platformWallet = _platformWallet;
        
        // 初始化19个等级
        _initializeLevels();
    }
    
    function _initializeLevels() internal {
        levels[1] = Level(130 * 1e6, 500, "Warrior", true);
        levels[2] = Level(150 * 1e6, 100, "Bronze", true);
        levels[3] = Level(200 * 1e6, 200, "Silver", true);
        levels[4] = Level(250 * 1e6, 300, "Gold", true);
        levels[5] = Level(300 * 1e6, 400, "Elite", true);
        levels[6] = Level(350 * 1e6, 500, "Platinum", true);
        levels[7] = Level(400 * 1e6, 600, "Master", true);
        levels[8] = Level(450 * 1e6, 700, "Diamond", true);
        levels[9] = Level(500 * 1e6, 800, "Grandmaster", true);
        levels[10] = Level(550 * 1e6, 900, "Starlight", true);
        levels[11] = Level(600 * 1e6, 1000, "Epic", true);
        levels[12] = Level(650 * 1e6, 1100, "Legend", true);
        levels[13] = Level(700 * 1e6, 1200, "Supreme King", true);
        levels[14] = Level(750 * 1e6, 1300, "Peerless King", true);
        levels[15] = Level(800 * 1e6, 1400, "Glory King", true);
        levels[16] = Level(850 * 1e6, 1500, "Legendary", true);
        levels[17] = Level(900 * 1e6, 1600, "Supreme", true);
        levels[18] = Level(950 * 1e6, 900, "Mythic", true);
        levels[19] = Level(1000 * 1e6, 1950, "Mythic Apex", true);
    }
    
    /**
     * @notice 购买会员等级
     * @param _level 目标等级 (1-19)
     * @param _referrer 推荐人地址 (首次购买必填)
     */
    function purchaseLevel(uint256 _level, address _referrer) external nonReentrant {
        require(_level >= 1 && _level <= MAX_LEVEL, "Invalid level");
        require(levels[_level].active, "Level not active");
        require(_level > memberLevel[msg.sender], "Must upgrade to higher level");
        
        Level memory lvl = levels[_level];
        
        // 首次购买必须有推荐人
        if (memberLevel[msg.sender] == 0) {
            require(_referrer != address(0) && _referrer != msg.sender, "Invalid referrer");
            referrer[msg.sender] = _referrer;
        }
        
        // 转移 USDT
        require(
            usdtToken.transferFrom(msg.sender, address(this), lvl.priceUSDT),
            "USDT transfer failed"
        );
        
        uint256 previousLevel = memberLevel[msg.sender];
        memberLevel[msg.sender] = _level;
        
        // 铸造 NFT
        _mint(msg.sender, _level, 1, "");
        
        // 处理直推奖励 (仅 Level 1)
        if (previousLevel == 0 && referrer[msg.sender] != address(0)) {
            _payDirectSponsor(referrer[msg.sender], msg.sender);
        }
        
        // 通知奖励合约处理层级奖励
        if (rewardsContract != address(0)) {
            IBeehiveRewards(rewardsContract).processLayerReward(
                msg.sender,
                _level,
                lvl.priceUSDT
            );
        }
        
        emit MembershipPurchased(msg.sender, _level, referrer[msg.sender], lvl.priceUSDT);
        
        if (previousLevel > 0) {
            emit LevelUpgraded(msg.sender, previousLevel, _level);
        }
    }
    
    function _payDirectSponsor(address _sponsor, address _buyer) internal {
        // 检查推荐人是否有资格领取
        if (memberLevel[_sponsor] >= 1) {
            usdtToken.transfer(_sponsor, directSponsorReward);
            emit DirectSponsorPaid(_sponsor, _buyer, directSponsorReward);
        }
        // 如果推荐人未激活，奖励暂存在合约中
    }
    
    // === 管理函数 ===
    
    function setRewardsContract(address _rewards) external onlyOwner {
        rewardsContract = _rewards;
    }
    
    function setLevelPrice(uint256 _level, uint256 _price) external onlyOwner {
        require(_level >= 1 && _level <= MAX_LEVEL, "Invalid level");
        levels[_level].priceUSDT = _price;
    }
    
    function setDirectSponsorReward(uint256 _amount) external onlyOwner {
        directSponsorReward = _amount;
    }
    
    function withdrawUSDT(uint256 _amount) external onlyOwner {
        usdtToken.transfer(platformWallet, _amount);
    }
    
    function withdrawAll() external onlyOwner {
        uint256 balance = usdtToken.balanceOf(address(this));
        usdtToken.transfer(platformWallet, balance);
    }
    
    // === 查询函数 ===
    
    function getLevelInfo(uint256 _level) external view returns (Level memory) {
        return levels[_level];
    }
    
    function getMemberInfo(address _member) external view returns (
        uint256 level,
        address ref,
        uint256[] memory ownedTokens
    ) {
        level = memberLevel[_member];
        ref = referrer[_member];
        
        // 获取用户拥有的所有等级 NFT
        ownedTokens = new uint256[](MAX_LEVEL);
        for (uint256 i = 1; i <= MAX_LEVEL; i++) {
            ownedTokens[i-1] = balanceOf(_member, i);
        }
    }
    
    function uri(uint256 _tokenId) public pure override returns (string memory) {
        return string(abi.encodePacked(
            "https://api.beehive.io/metadata/",
            _toString(_tokenId)
        ));
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

interface IBeehiveRewards {
    function processLayerReward(address member, uint256 level, uint256 amount) external;
}
```

### 3.2 BeehiveRewards.sol (奖励分配)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BeehiveRewards is Ownable, ReentrancyGuard {
    
    IERC20 public usdtToken;
    address public membershipContract;
    
    // 层级奖励配置
    mapping(uint256 => uint256) public layerRewardAmount;  // level => USDT amount
    
    // 用户待领取奖励
    mapping(address => uint256) public pendingRewardsUSDT;
    mapping(address => uint256) public pendingRewardsBCC;
    
    // 用户已领取奖励
    mapping(address => uint256) public claimedRewardsUSDT;
    mapping(address => uint256) public claimedRewardsBCC;
    
    // 矩阵树结构 (在后端处理，这里只存储关系)
    mapping(address => address) public upline;  // 用户 => 上线
    mapping(address => address[]) public downlines;  // 用户 => 下线数组
    
    event LayerRewardProcessed(
        address indexed member,
        address indexed upline,
        uint256 level,
        uint256 layerDepth,
        uint256 amount
    );
    event RewardClaimed(address indexed member, uint256 usdtAmount, uint256 bccAmount);
    
    constructor(address _usdtToken) Ownable(msg.sender) {
        usdtToken = IERC20(_usdtToken);
        
        // 初始化层级奖励金额
        layerRewardAmount[2] = 150 * 1e6;
        layerRewardAmount[3] = 200 * 1e6;
        layerRewardAmount[4] = 250 * 1e6;
        layerRewardAmount[5] = 300 * 1e6;
        layerRewardAmount[6] = 350 * 1e6;
        layerRewardAmount[7] = 400 * 1e6;
        layerRewardAmount[8] = 450 * 1e6;
        layerRewardAmount[9] = 500 * 1e6;
        layerRewardAmount[10] = 550 * 1e6;
        layerRewardAmount[11] = 600 * 1e6;
        layerRewardAmount[12] = 650 * 1e6;
        layerRewardAmount[13] = 700 * 1e6;
        layerRewardAmount[14] = 750 * 1e6;
        layerRewardAmount[15] = 800 * 1e6;
        layerRewardAmount[16] = 850 * 1e6;
        layerRewardAmount[17] = 900 * 1e6;
        layerRewardAmount[18] = 950 * 1e6;
        layerRewardAmount[19] = 1000 * 1e6;
    }
    
    modifier onlyMembershipContract() {
        require(msg.sender == membershipContract, "Only membership contract");
        _;
    }
    
    function setMembershipContract(address _membership) external onlyOwner {
        membershipContract = _membership;
    }
    
    /**
     * @notice 处理层级奖励 (由 Membership 合约调用)
     * @dev 实际的层级查询在后端完成，这里接收后端计算结果
     */
    function processLayerReward(
        address member,
        uint256 level,
        uint256 /* amount */
    ) external onlyMembershipContract {
        // 层级奖励逻辑在后端处理
        // 这里只是记录事件，实际分配由后端调用 distributeReward
    }
    
    /**
     * @notice 分配奖励 (由后端服务调用)
     * @param _recipient 接收者地址
     * @param _usdtAmount USDT 奖励金额
     * @param _bccAmount BCC 奖励金额
     */
    function distributeReward(
        address _recipient,
        uint256 _usdtAmount,
        uint256 _bccAmount
    ) external onlyOwner {
        if (_usdtAmount > 0) {
            pendingRewardsUSDT[_recipient] += _usdtAmount;
        }
        if (_bccAmount > 0) {
            pendingRewardsBCC[_recipient] += _bccAmount;
        }
    }
    
    /**
     * @notice 批量分配奖励
     */
    function batchDistributeReward(
        address[] calldata _recipients,
        uint256[] calldata _usdtAmounts,
        uint256[] calldata _bccAmounts
    ) external onlyOwner {
        require(
            _recipients.length == _usdtAmounts.length && 
            _recipients.length == _bccAmounts.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_usdtAmounts[i] > 0) {
                pendingRewardsUSDT[_recipients[i]] += _usdtAmounts[i];
            }
            if (_bccAmounts[i] > 0) {
                pendingRewardsBCC[_recipients[i]] += _bccAmounts[i];
            }
        }
    }
    
    /**
     * @notice 领取奖励
     */
    function claimRewards() external nonReentrant {
        uint256 usdtAmount = pendingRewardsUSDT[msg.sender];
        uint256 bccAmount = pendingRewardsBCC[msg.sender];
        
        require(usdtAmount > 0 || bccAmount > 0, "No rewards to claim");
        
        if (usdtAmount > 0) {
            pendingRewardsUSDT[msg.sender] = 0;
            claimedRewardsUSDT[msg.sender] += usdtAmount;
            require(usdtToken.transfer(msg.sender, usdtAmount), "USDT transfer failed");
        }
        
        // BCC 转账由 BCC Token 合约处理
        if (bccAmount > 0) {
            pendingRewardsBCC[msg.sender] = 0;
            claimedRewardsBCC[msg.sender] += bccAmount;
            // BCC 代币在后端铸造或转账
        }
        
        emit RewardClaimed(msg.sender, usdtAmount, bccAmount);
    }
    
    /**
     * @notice 查询用户奖励
     */
    function getRewardInfo(address _member) external view returns (
        uint256 pendingUSDT,
        uint256 pendingBCC,
        uint256 claimedUSDT,
        uint256 claimedBCC
    ) {
        return (
            pendingRewardsUSDT[_member],
            pendingRewardsBCC[_member],
            claimedRewardsUSDT[_member],
            claimedRewardsBCC[_member]
        );
    }
    
    /**
     * @notice 存入 USDT (用于奖励分配)
     */
    function depositUSDT(uint256 _amount) external {
        require(usdtToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
    }
    
    /**
     * @notice 紧急提款
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}
```

### 3.3 BCCToken.sol (BCC 代币)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BCCToken is ERC20, Ownable {
    
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    constructor() ERC20("Beehive Crypto Coin", "BCC") Ownable(msg.sender) {
        // 初始铸造给部署者
        _mint(msg.sender, 1_000_000_000 * 10**18);  // 10亿 BCC
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    function addMinter(address _minter) external onlyOwner {
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    function removeMinter(address _minter) external onlyOwner {
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    function mint(address _to, uint256 _amount) external onlyMinter {
        _mint(_to, _amount);
    }
    
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}
```

### 3.4 部署步骤 (Remix IDE)

```
1. 打开 https://remix.ethereum.org

2. 创建文件:
   - BCCToken.sol
   - BeehiveMembership.sol
   - BeehiveRewards.sol

3. 编译设置:
   - Compiler: 0.8.20
   - Enable optimization: true
   - Runs: 200

4. 部署顺序 (Arbitrum One):
   a) 部署 BCCToken
   b) 部署 BeehiveMembership
      - _usdtToken: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 (Arbitrum USDT)
      - _platformWallet: 你的钱包地址
      - _uri: "https://api.beehive.io/metadata/{id}"
   c) 部署 BeehiveRewards
      - _usdtToken: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
   d) 调用 BeehiveMembership.setRewardsContract(rewards地址)
   e) 调用 BeehiveRewards.setMembershipContract(membership地址)
   f) 调用 BCCToken.addMinter(rewards地址)

5. 验证合约:
   - 在 Arbiscan 验证源代码
   - 使用 Hardhat 或手动验证
```

---

## 4. 后端 API

### 4.1 Hono.js API 结构

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { memberRoutes } from './routes/members';
import { rewardRoutes } from './routes/rewards';
import { matrixRoutes } from './routes/matrix';
import { adminRoutes } from './routes/admin';
import { webhookRoutes } from './routes/webhook';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['https://beehive.io', 'http://localhost:3000'],
  credentials: true,
}));
app.use('*', logger());

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/members', memberRoutes);
app.route('/api/rewards', rewardRoutes);
app.route('/api/matrix', matrixRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/webhook', webhookRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default {
  port: 4000,
  fetch: app.fetch,
};
```

### 4.2 奖励服务 (整合 tree_diagram 逻辑)

```typescript
// apps/api/src/services/RewardService.ts
import { db } from '../db';
import { members, rewards, memberClosure, layerCounters } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export class RewardService {
  
  /**
   * 处理直推奖励
   */
  async processDirectSponsorReward(
    sponsorWallet: string,
    newMemberWallet: string,
    transactionId: number
  ) {
    const sponsor = await db.query.members.findFirst({
      where: eq(members.walletAddress, sponsorWallet)
    });
    
    if (!sponsor) return;
    
    const directSponsorReward = 100; // 100 USDT
    
    // 检查 sponsor 等级
    if (sponsor.currentLevel === 0) {
      // Pending - sponsor 未激活
      await db.insert(rewards).values({
        recipientWallet: sponsorWallet,
        sourceWallet: newMemberWallet,
        rewardType: 'direct_sponsor',
        amount: directSponsorReward,
        currency: 'USDT',
        status: 'pending',
        notes: 'Pending - sponsor must activate first'
      });
    } else if (sponsor.currentLevel === 1 && sponsor.directSponsorCount >= 2) {
      // Pending - Level 1 限制前2个
      await db.insert(rewards).values({
        recipientWallet: sponsorWallet,
        sourceWallet: newMemberWallet,
        rewardType: 'direct_sponsor',
        amount: directSponsorReward,
        currency: 'USDT',
        status: 'pending',
        notes: 'Pending - upgrade to Level 2 required'
      });
    } else {
      // Instant payout
      await db.insert(rewards).values({
        recipientWallet: sponsorWallet,
        sourceWallet: newMemberWallet,
        rewardType: 'direct_sponsor',
        amount: directSponsorReward,
        currency: 'USDT',
        status: 'instant',
      });
      
      // 更新 sponsor 计数
      await db.update(members)
        .set({ directSponsorCount: sql`${members.directSponsorCount} + 1` })
        .where(eq(members.walletAddress, sponsorWallet));
    }
  }
  
  /**
   * 处理层级奖励
   */
  async processLayerReward(
    memberWallet: string,
    level: number,
    paymentAmount: number
  ) {
    if (level < 2) return;
    
    const member = await db.query.members.findFirst({
      where: eq(members.walletAddress, memberWallet)
    });
    
    if (!member) return;
    
    // 找到第 N 层的上线 (N = level)
    const upline = await this.findUplineAtLayer(member.id, level);
    
    if (!upline) {
      console.log(`No upline at layer ${level} for ${memberWallet}`);
      return;
    }
    
    const layerRewardAmounts: Record<number, number> = {
      2: 150, 3: 200, 4: 250, 5: 300, 6: 350, 7: 400, 8: 450, 9: 500,
      10: 550, 11: 600, 12: 650, 13: 700, 14: 750, 15: 800, 16: 850,
      17: 900, 18: 950, 19: 1000
    };
    
    const rewardAmount = layerRewardAmounts[level] || 0;
    
    // 检查上线是否达到该等级
    if (upline.currentLevel >= level) {
      // Instant
      await db.insert(rewards).values({
        recipientWallet: upline.walletAddress,
        sourceWallet: memberWallet,
        rewardType: 'layer_payout',
        amount: rewardAmount,
        currency: 'USDT',
        status: 'instant',
        layerNumber: level,
      });
    } else {
      // Pending
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      await db.insert(rewards).values({
        recipientWallet: upline.walletAddress,
        sourceWallet: memberWallet,
        rewardType: 'layer_payout',
        amount: rewardAmount,
        currency: 'USDT',
        status: 'pending',
        layerNumber: level,
        pendingExpiresAt: expiresAt,
        notes: `Need Level ${level}, current: ${upline.currentLevel}`
      });
    }
  }
  
  /**
   * 使用 Closure Table 查找指定层的上线
   */
  async findUplineAtLayer(memberId: number, depth: number) {
    const result = await db.select({
      id: members.id,
      walletAddress: members.walletAddress,
      currentLevel: members.currentLevel,
    })
    .from(memberClosure)
    .innerJoin(members, eq(memberClosure.ancestorId, members.id))
    .where(
      and(
        eq(memberClosure.descendantId, memberId),
        eq(memberClosure.depth, depth)
      )
    )
    .limit(1);
    
    return result[0] || null;
  }
  
  /**
   * 释放待领取奖励 (用户升级后)
   */
  async releasePendingRewards(wallet: string, newLevel: number) {
    // 释放层级奖励
    await db.update(rewards)
      .set({ 
        status: 'instant',
        pendingExpiresAt: null,
        notes: sql`CONCAT(${rewards.notes}, ' (released after upgrade)')`
      })
      .where(
        and(
          eq(rewards.recipientWallet, wallet),
          eq(rewards.status, 'pending'),
          eq(rewards.rewardType, 'layer_payout'),
          sql`${rewards.layerNumber} <= ${newLevel}`
        )
      );
    
    // 释放直推奖励 (升级到 Level 2+)
    if (newLevel >= 2) {
      await db.update(rewards)
        .set({ 
          status: 'instant',
          pendingExpiresAt: null,
        })
        .where(
          and(
            eq(rewards.recipientWallet, wallet),
            eq(rewards.status, 'pending'),
            eq(rewards.rewardType, 'direct_sponsor')
          )
        );
    }
  }
}
```

### 4.3 矩阵服务 (3×3 树结构)

```typescript
// apps/api/src/services/MatrixService.ts
import { db } from '../db';
import { members, placements, memberClosure } from '../db/schema';
import { eq, and, sql, lt } from 'drizzle-orm';

export class MatrixService {
  
  /**
   * 为新成员找到放置位置 (3×3 强制矩阵)
   */
  async findPlacement(sponsorId: number): Promise<{ parentId: number; position: number } | null> {
    // Phase A: 直接放在 sponsor 下方
    const directCount = await this.getChildCount(sponsorId);
    
    if (directCount < 3) {
      return {
        parentId: sponsorId,
        position: directCount + 1
      };
    }
    
    // Phase B: 在 sponsor 子树中寻找空位
    const candidates = await db.select({
      parentId: members.id,
      depth: memberClosure.depth,
      childCount: sql<number>`(
        SELECT COUNT(*) FROM placements p WHERE p.parent_id = ${members.id}
      )`,
      joinedAt: members.joinedAt,
    })
    .from(members)
    .innerJoin(memberClosure, eq(memberClosure.descendantId, members.id))
    .where(
      and(
        eq(memberClosure.ancestorId, sponsorId),
        sql`(SELECT COUNT(*) FROM placements p WHERE p.parent_id = ${members.id}) < 3`
      )
    )
    .orderBy(
      memberClosure.depth,
      members.joinedAt,
      members.id
    );
    
    for (const candidate of candidates) {
      const usedPositions = await this.getUsedPositions(candidate.parentId);
      const availablePosition = [1, 2, 3].find(p => !usedPositions.includes(p));
      
      if (availablePosition) {
        return {
          parentId: candidate.parentId,
          position: availablePosition
        };
      }
    }
    
    return null;
  }
  
  /**
   * 放置新成员
   */
  async placeMember(memberId: number, parentId: number, position: number, sponsorId: number) {
    // 1. 插入 placement
    await db.insert(placements).values({
      parentId,
      childId: memberId,
      position
    });
    
    // 2. 插入 self-link
    await db.insert(memberClosure).values({
      ancestorId: memberId,
      descendantId: memberId,
      depth: 0
    }).onConflictDoNothing();
    
    // 3. 插入所有祖先关系
    await db.execute(sql`
      INSERT INTO member_closure (ancestor_id, descendant_id, depth)
      SELECT ancestor_id, ${memberId}, depth + 1
      FROM member_closure
      WHERE descendant_id = ${parentId}
    `);
    
    // 4. 更新 root_id
    const parent = await db.query.members.findFirst({
      where: eq(members.id, parentId)
    });
    
    if (parent) {
      await db.update(members)
        .set({ 
          rootId: parent.rootId || parentId,
          sponsorId: sponsorId
        })
        .where(eq(members.id, memberId));
    }
  }
  
  /**
   * 获取树结构
   */
  async getTree(memberId: number, maxDepth: number = 3) {
    const result = await db.select({
      id: members.id,
      walletAddress: members.walletAddress,
      username: members.username,
      currentLevel: members.currentLevel,
      depth: memberClosure.depth,
    })
    .from(memberClosure)
    .innerJoin(members, eq(memberClosure.descendantId, members.id))
    .where(
      and(
        eq(memberClosure.ancestorId, memberId),
        sql`${memberClosure.depth} <= ${maxDepth}`
      )
    )
    .orderBy(memberClosure.depth, members.id);
    
    return this.buildTreeStructure(result, memberId);
  }
  
  private async getChildCount(parentId: number): Promise<number> {
    const result = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(placements)
    .where(eq(placements.parentId, parentId));
    
    return result[0]?.count || 0;
  }
  
  private async getUsedPositions(parentId: number): Promise<number[]> {
    const result = await db.select({
      position: placements.position
    })
    .from(placements)
    .where(eq(placements.parentId, parentId));
    
    return result.map(r => r.position);
  }
  
  private buildTreeStructure(nodes: any[], rootId: number) {
    // 递归构建树结构
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });
    
    // ... 构建树逻辑
    return nodeMap.get(rootId);
  }
}
```

---

## 5. 数据库设计

### 5.1 Drizzle Schema

```typescript
// apps/api/src/db/schema.ts
import { pgTable, serial, varchar, integer, decimal, timestamp, boolean, text, bigint, smallint, primaryKey } from 'drizzle-orm/pg-core';

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  username: varchar('username', { length: 80 }),
  email: varchar('email', { length: 255 }),
  avatarUrl: text('avatar_url'),
  language: varchar('language', { length: 10 }).default('en'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 会员表
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  username: varchar('username', { length: 80 }),
  rootId: integer('root_id').references(() => members.id),
  sponsorId: integer('sponsor_id').references(() => members.id),
  currentLevel: integer('current_level').default(0),
  totalInflow: decimal('total_inflow', { precision: 10, scale: 2 }).default('0'),
  totalOutflowUsdt: decimal('total_outflow_usdt', { precision: 10, scale: 2 }).default('0'),
  totalOutflowBcc: integer('total_outflow_bcc').default(0),
  directSponsorCount: integer('direct_sponsor_count').default(0),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// 矩阵放置表
export const placements = pgTable('placements', {
  parentId: bigint('parent_id', { mode: 'number' }).notNull().references(() => members.id),
  childId: bigint('child_id', { mode: 'number' }).primaryKey().references(() => members.id),
  position: smallint('position').notNull(), // 1, 2, 3
  createdAt: timestamp('created_at').defaultNow(),
});

// 闭包表
export const memberClosure = pgTable('member_closure', {
  ancestorId: bigint('ancestor_id', { mode: 'number' }).notNull().references(() => members.id),
  descendantId: bigint('descendant_id', { mode: 'number' }).notNull().references(() => members.id),
  depth: integer('depth').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.ancestorId, table.descendantId] }),
}));

// 奖励表
export const rewards = pgTable('rewards', {
  id: serial('id').primaryKey(),
  recipientWallet: varchar('recipient_wallet', { length: 42 }).notNull(),
  sourceWallet: varchar('source_wallet', { length: 42 }),
  rewardType: varchar('reward_type', { length: 20 }).notNull(), // direct_sponsor, layer_payout, bcc_token
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(), // USDT, BCC
  status: varchar('status', { length: 20 }).notNull(), // instant, pending, claimed, expired
  layerNumber: integer('layer_number'),
  pendingExpiresAt: timestamp('pending_expires_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  claimedAt: timestamp('claimed_at'),
});

// 交易表
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }),
  level: integer('level').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 等级定义
export const levels = pgTable('levels', {
  level: integer('level').primaryKey(),
  nameEn: varchar('name_en', { length: 50 }).notNull(),
  nameCn: varchar('name_cn', { length: 50 }).notNull(),
  priceUsdt: decimal('price_usdt', { precision: 10, scale: 2 }).notNull(),
  bccReward: integer('bcc_reward').notNull(),
});

// 层级计数器
export const layerCounters = pgTable('layer_counters', {
  id: serial('id').primaryKey(),
  uplineMemberId: integer('upline_member_id').notNull().references(() => members.id),
  layerNumber: integer('layer_number').notNull(),
  upgradeCount: integer('upgrade_count').default(0),
});
```

---

## 6. 前端

### 6.1 Web3 配置 (wagmi + viem)

```typescript
// apps/web/lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID!;

export const config = createConfig({
  chains: [arbitrum, arbitrumSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
});
```

### 6.2 合约交互

```typescript
// apps/web/lib/contracts.ts
import { getContract } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

// 合约地址 (部署后更新)
export const CONTRACTS = {
  MEMBERSHIP: '0x...',
  REWARDS: '0x...',
  BCC_TOKEN: '0x...',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum USDT
};

// ABI (简化版)
export const MEMBERSHIP_ABI = [
  {
    name: 'purchaseLevel',
    type: 'function',
    inputs: [
      { name: '_level', type: 'uint256' },
      { name: '_referrer', type: 'address' },
    ],
  },
  {
    name: 'memberLevel',
    type: 'function',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  // ... 更多函数
] as const;

// Hook: 购买等级
export function usePurchaseLevel() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const purchase = async (level: number, referrer: string) => {
    if (!walletClient) throw new Error('Wallet not connected');
    
    // 1. Approve USDT
    const levelPrices: Record<number, bigint> = {
      1: 130000000n, // 130 USDT (6 decimals)
      2: 150000000n,
      // ...
    };
    
    const price = levelPrices[level];
    
    await walletClient.writeContract({
      address: CONTRACTS.USDT,
      abi: USDT_ABI,
      functionName: 'approve',
      args: [CONTRACTS.MEMBERSHIP, price],
    });
    
    // 2. Purchase
    const hash = await walletClient.writeContract({
      address: CONTRACTS.MEMBERSHIP,
      abi: MEMBERSHIP_ABI,
      functionName: 'purchaseLevel',
      args: [BigInt(level), referrer as `0x${string}`],
    });
    
    // 3. Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    return receipt;
  };
  
  return { purchase };
}
```

---

## 7. VPS 部署

### 7.1 服务器要求

| 配置 | 最低要求 | 推荐 |
|------|----------|------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 存储 | 40 GB SSD | 80 GB SSD |
| 系统 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 7.2 安装脚本

```bash
#!/bin/bash
# setup.sh - Beehive VPS 一键安装脚本

set -e

echo "🐝 Setting up Beehive Platform..."

# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装 pnpm
npm install -g pnpm

# 4. 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 5. 安装 Redis
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 6. 安装 Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 7. 安装 PM2
npm install -g pm2

# 8. 安装 Certbot (SSL)
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# 9. 配置 PostgreSQL
sudo -u postgres psql -c "CREATE USER beehive WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE beehive OWNER beehive;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE beehive TO beehive;"

echo "✅ Base setup complete!"
echo "Next: Clone repo, configure .env, run migrations"
```

### 7.3 Nginx 配置

```nginx
# /etc/nginx/sites-available/beehive
server {
    listen 80;
    server_name beehive.io www.beehive.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name beehive.io www.beehive.io;

    ssl_certificate /etc/letsencrypt/live/beehive.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/beehive.io/privkey.pem;

    # Next.js 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 后端
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.4 PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'beehive-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'beehive-api',
      cwd: './apps/api',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_URL: 'postgresql://beehive:password@localhost:5432/beehive',
        REDIS_URL: 'redis://localhost:6379',
      },
    },
  ],
};
```

### 7.5 部署命令

```bash
# 1. 克隆项目
git clone https://github.com/your/beehive.git
cd beehive

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
nano .env

# 4. 运行数据库迁移
pnpm db:migrate

# 5. 构建
pnpm build

# 6. 启动 PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 7. 配置 Nginx
sudo ln -s /etc/nginx/sites-available/beehive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 8. 获取 SSL 证书
sudo certbot --nginx -d beehive.io -d www.beehive.io
```

---

## 8. 开发流程

### 8.1 本地开发

```bash
# 1. 启动 Docker (PostgreSQL + Redis)
docker-compose up -d

# 2. 运行迁移
pnpm db:migrate

# 3. 启动开发服务器
pnpm dev
# 前端: http://localhost:3000
# API: http://localhost:4000
```

### 8.2 智能合约开发

```bash
# 1. 安装 Hardhat (可选，用于本地测试)
cd contracts
npm install

# 2. 编译
npx hardhat compile

# 3. 本地测试
npx hardhat test

# 4. 部署到测试网 (或使用 Remix)
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# 5. 验证合约
npx hardhat verify --network arbitrum <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 8.3 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: beehive
      POSTGRES_PASSWORD: password
      POSTGRES_DB: beehive
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 📝 总结

### 技术栈对比

| 项目 | 原方案 | 新方案 |
|------|--------|--------|
| 前端 | React + Vite | Next.js 14 |
| 后端 | Supabase / Express | Hono.js |
| 数据库 | Supabase / MySQL | PostgreSQL (自托管) |
| ORM | - | Drizzle |
| Web3 | Thirdweb SDK | wagmi + viem |
| 智能合约 | Thirdweb 托管 | 自定义 Solidity |
| 部署 | Vercel + 多服务 | 单一 VPS |

### 优势

1. **完全自主控制** - 不依赖第三方服务
2. **成本更低** - 只需一台 VPS
3. **更灵活** - 可以自定义智能合约逻辑
4. **统一架构** - 前后端 + 奖励系统一体化
5. **更好性能** - Hono.js 比 Express 快 4x

---

*文档生成日期: 2025年11月*

