// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BCCToken
 * @notice Beehive Crypto Coin (BCC) - ERC-20 token for platform rewards
 * @dev Implements minting functionality with authorized minters
 */
contract BCCToken is ERC20, Ownable {
    // Authorized minters mapping
    mapping(address => bool) public minters;

    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    /**
     * @notice Constructor - mints initial supply to deployer
     * @dev Initial supply: 1 billion BCC tokens
     */
    constructor() ERC20("Beehive Crypto Coin", "BCC") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1_000_000_000 * 10 ** 18); // 1 billion BCC
    }

    /**
     * @notice Modifier to restrict function to authorized minters
     */
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "BCCToken: Not authorized to mint");
        _;
    }

    /**
     * @notice Add a new minter address
     * @param _minter Address to authorize as minter
     */
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "BCCToken: Invalid minter address");
        require(!minters[_minter], "BCCToken: Already a minter");
        
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }

    /**
     * @notice Remove a minter address
     * @param _minter Address to remove from minters
     */
    function removeMinter(address _minter) external onlyOwner {
        require(minters[_minter], "BCCToken: Not a minter");
        
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }

    /**
     * @notice Mint new tokens to an address
     * @param _to Recipient address
     * @param _amount Amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) external onlyMinter {
        require(_to != address(0), "BCCToken: Cannot mint to zero address");
        _mint(_to, _amount);
    }

    /**
     * @notice Burn tokens from caller's balance
     * @param _amount Amount of tokens to burn
     */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }

    /**
     * @notice Check if an address is an authorized minter
     * @param _address Address to check
     * @return bool True if address is a minter
     */
    function isMinter(address _address) external view returns (bool) {
        return minters[_address] || _address == owner();
    }
}

