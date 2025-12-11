# Quick Start: Deploy TUSDT & BCC to BSC via Remix

## 🚀 Fast Deployment Steps

### 1. Open Remix IDE
Go to: https://remix.ethereum.org

### 2. Create TUSDT Contract
1. Click **File Explorer** → **Create new file** → Name: `TUSDT.sol`
2. Copy and paste this code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/access/Ownable.sol";

contract TUSDT is ERC20, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**6;

    constructor(address initialOwner) ERC20("Test USDT", "TUSDT") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

### 3. Create BCC Contract
1. Create new file: `BCC.sol`
2. Copy and paste this code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/access/Ownable.sol";

contract BCC is ERC20, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**18;

    constructor(address initialOwner) ERC20("Beehive Coin", "BCC") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

### 4. Compile
1. Go to **Solidity Compiler** tab
2. Select compiler: **0.8.20**
3. Click **Compile TUSDT.sol** (wait for it to finish)
4. Click **Compile BCC.sol** (wait for it to finish)

### 5. Connect MetaMask
1. Go to **Deploy & Run Transactions** tab
2. Environment: **Injected Provider - MetaMask**
3. **IMPORTANT**: Switch MetaMask to BSC network:
   - Click MetaMask → Networks → Add Network
   - **BSC Mainnet**: RPC `https://bsc-dataseed1.binance.org`, Chain ID `56`
   - **BSC Testnet**: RPC `https://data-seed-prebsc-1-s1.binance.org:8545`, Chain ID `97`

### 6. Deploy TUSDT
1. Contract dropdown: Select **TUSDT**
2. Constructor parameter: `initialOwner` → Enter your wallet address
3. Click **Deploy**
4. Confirm in MetaMask
5. **Copy the contract address** from Remix

### 7. Deploy BCC
1. Contract dropdown: Select **BCC**
2. Constructor parameter: `initialOwner` → Enter your wallet address (same as TUSDT)
3. Click **Deploy**
4. Confirm in MetaMask
5. **Copy the contract address** from Remix

### 8. Verify on BSCScan
1. Go to https://bscscan.com (or testnet.bscscan.com)
2. Search your contract address
3. Click **Contract** → **Verify and Publish**
4. Select:
   - Compiler: **0.8.20**
   - License: **MIT**
   - Code: Paste your contract code
5. Click **Verify**

## ✅ Done!

You now have:
- **TUSDT**: 1,000,000 tokens (6 decimals) at your contract address
- **BCC**: 1,000,000 tokens (18 decimals) at your contract address

Both tokens are in your wallet as the initial owner!

