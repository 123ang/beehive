// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TUSDT - Test USDT Token
 * @dev ERC-20 compatible token for testing purposes
 * Compatible with BEP20 standard (Binance Smart Chain)
 * Uses 6 decimals like real USDT
 */
contract TUSDT is ERC20, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**6; // 1 million tokens with 6 decimals

    constructor(address initialOwner) ERC20("Test USDT", "TUSDT") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @dev Override decimals to match real USDT (6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev Mint additional tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (with 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

