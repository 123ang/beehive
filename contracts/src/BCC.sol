// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BCC - Beehive Coin
 * @dev ERC-20 compatible token for Beehive platform
 * Compatible with BEP20 standard (Binance Smart Chain)
 */
contract BCC is ERC20, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1 million tokens with 18 decimals

    constructor(address initialOwner) ERC20("Beehive Coin", "BCC") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @dev Mint additional tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
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

    /**
     * @dev Get total supply
     * @return Total supply of tokens
     */
    function totalSupply() public view virtual override returns (uint256) {
        return super.totalSupply();
    }
}

