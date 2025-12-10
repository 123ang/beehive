// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @notice Mock USDT token for local development and testing
 * @dev DO NOT DEPLOY TO MAINNET - This is for testing only!
 */
contract MockUSDT is ERC20, Ownable {
    
    /**
     * @notice Constructor - mints initial supply to deployer
     */
    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {
        // Mint 1 million USDT to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    /**
     * @notice Override decimals to match real USDT (6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Faucet function for testing - anyone can get test USDT
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint (with 6 decimals)
     */
    function faucet(address to, uint256 amount) external {
        require(amount <= 100_000 * 10**6, "Max 100,000 USDT per faucet call");
        _mint(to, amount);
    }

    /**
     * @notice Mint function for owner
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

