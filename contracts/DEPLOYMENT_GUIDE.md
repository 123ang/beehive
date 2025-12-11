# Token Deployment Guide - Remix IDE (BEP20/BSC)

This guide will help you deploy the TUSDT and BCC tokens to Binance Smart Chain (BSC) using Remix IDE.

## Prerequisites

1. **MetaMask Wallet** with BNB for gas fees
2. **Remix IDE** (https://remix.ethereum.org)
3. **BSC Testnet or Mainnet** configured in MetaMask

### BSC Network Configuration

Add BSC network to MetaMask:

**BSC Mainnet:**
- Network Name: BSC Mainnet
- RPC URL: https://bsc-dataseed1.binance.org
- Chain ID: 56
- Currency Symbol: BNB
- Block Explorer: https://bscscan.com

**BSC Testnet:**
- Network Name: BSC Testnet
- RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
- Chain ID: 97
- Currency Symbol: BNB
- Block Explorer: https://testnet.bscscan.com

## Step-by-Step Deployment

### Step 1: Open Remix IDE

1. Go to https://remix.ethereum.org
2. Create a new workspace or use the default one

### Step 2: Create Token Contracts in Remix

**Method 1: Direct GitHub Import (Recommended)**

1. In Remix, go to the **File Explorer** tab
2. Create a new file: `TUSDT.sol`
3. Paste the following code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/access/Ownable.sol";

contract TUSDT is ERC20, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**6; // 1 million tokens with 6 decimals

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

4. Create another file: `BCC.sol`
5. Paste the following code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/access/Ownable.sol";

contract BCC is ERC20, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1 million tokens with 18 decimals

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

**Note:** Remix will automatically download OpenZeppelin contracts from GitHub when you compile.

### Step 3: Compile Contracts

1. Go to the **Solidity Compiler** tab (left sidebar)
2. Select compiler version: **0.8.20** or higher
3. Click **Compile TUSDT.sol** (or BCC.sol)
4. Check for any compilation errors
5. If you see import errors, you may need to:
   - Use Remix's auto-import feature
   - Or manually create the OpenZeppelin folder structure as described above

### Step 4: Connect MetaMask

1. Go to the **Deploy & Run Transactions** tab
2. In the **Environment** dropdown, select **Injected Provider - MetaMask**
3. MetaMask will pop up asking to connect
4. **Important**: Make sure you're connected to BSC network (Mainnet or Testnet)
5. Verify your account address is displayed

### Step 5: Deploy TUSDT Token

1. In the **Deploy & Run Transactions** tab:
   - **Contract**: Select `TUSDT`
   - **Constructor Arguments**: 
     - `initialOwner`: Enter your wallet address (the address that will receive the initial 1 million tokens)
   - Click **Deploy**
2. MetaMask will pop up:
   - Review the transaction
   - Confirm the gas fee
   - Click **Confirm**
3. Wait for transaction confirmation
4. Once deployed, you'll see:
   - Contract address (copy this!)
   - Transaction hash (view on BSCScan)

### Step 6: Deploy BCC Token

1. Repeat Step 6, but select `BCC` contract instead
2. Use the same `initialOwner` address
3. Deploy and confirm

### Step 7: Verify Contracts on BSCScan

1. Go to https://bscscan.com (or testnet.bscscan.com for testnet)
2. Search for your contract address
3. Click **Contract** tab → **Verify and Publish**
4. Select:
   - Compiler Type: **Solidity (Single file)**
   - Compiler Version: **v0.8.20+**
   - License: **MIT**
5. Paste your contract code
6. Click **Verify and Publish**

## Contract Details

### TUSDT Token
- **Name**: Test USDT
- **Symbol**: TUSDT
- **Decimals**: 6 (matches real USDT)
- **Initial Supply**: 1,000,000 TUSDT
- **Standard**: ERC-20 / BEP20

### BCC Token
- **Name**: Beehive Coin
- **Symbol**: BCC
- **Decimals**: 18
- **Initial Supply**: 1,000,000 BCC
- **Standard**: ERC-20 / BEP20

## Important Notes

1. **Gas Fees**: Deploying contracts on BSC requires BNB for gas. Make sure you have enough BNB in your wallet.

2. **Initial Owner**: The address you provide as `initialOwner` will receive all 1 million tokens initially. Make sure this is your correct address.

3. **Testnet First**: It's recommended to deploy to BSC Testnet first to test everything, then deploy to Mainnet.

4. **Contract Addresses**: Save the deployed contract addresses - you'll need them to configure your application.

5. **Security**: The owner can mint additional tokens. Keep the owner address secure or consider transferring ownership to a multisig wallet.

## Troubleshooting

### Import Errors
If you see import errors:
1. Make sure you're using the GitHub import URLs as shown in Step 2
2. Check your internet connection (Remix needs to download OpenZeppelin contracts)
3. Try refreshing the Remix page and recompiling

### Compilation Errors
- Ensure Solidity compiler version is 0.8.20 or compatible
- Check that all import statements are correct
- Verify contract syntax is correct

### Deployment Errors
- Make sure you have enough BNB in your wallet for gas fees
- Verify you're connected to the correct network (BSC Mainnet or Testnet)
- Check that the `initialOwner` address is valid

## Post-Deployment

After deployment, update your application configuration with:
- TUSDT contract address
- BCC contract address
- Network: BSC (Chain ID: 56 for mainnet, 97 for testnet)

