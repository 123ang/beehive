// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BeehiveMembership
 * @notice ERC-1155 based membership NFT system with 19 levels
 * @dev Each level is a unique token ID (1-19) with price in USDT
 */
contract BeehiveMembership is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // Level configuration structure
    struct Level {
        uint256 priceUSDT;    // Price in USDT (6 decimals)
        uint256 bccReward;     // BCC token reward amount
        string name;           // Level name
        bool active;           // Whether level is purchasable
    }

    // State variables
    mapping(uint256 => Level) public levels;
    mapping(address => uint256) public memberLevel;  // User's current highest level
    mapping(address => address) public referrer;     // User's referrer (sponsor)

    IERC20 public usdtToken;
    address public platformWallet;
    address public rewardsContract;

    uint256 public constant MAX_LEVEL = 19;
    uint256 public directSponsorReward = 100 * 1e6;  // 100 USDT (6 decimals)
    string public baseURI;

    // Events
    event MembershipPurchased(
        address indexed buyer,
        uint256 level,
        address indexed referrer,
        uint256 amount
    );
    event LevelUpgraded(address indexed member, uint256 fromLevel, uint256 toLevel);
    event DirectSponsorPaid(address indexed sponsor, address indexed buyer, uint256 amount);
    event RewardsContractUpdated(address indexed oldContract, address indexed newContract);

    /**
     * @notice Constructor
     * @param _usdtToken USDT token contract address
     * @param _platformWallet Platform wallet for funds
     * @param _uri Base URI for token metadata
     */
    constructor(
        address _usdtToken,
        address _platformWallet,
        string memory _uri
    ) ERC1155(_uri) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_platformWallet != address(0), "Invalid platform wallet");

        usdtToken = IERC20(_usdtToken);
        platformWallet = _platformWallet;
        baseURI = _uri;

        // Initialize all 19 membership levels
        _initializeLevels();
    }

    /**
     * @dev Initialize membership level configurations
     */
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
     * @notice Purchase a membership level
     * @param _level Target level (1-19)
     * @param _referrer Referrer address (required for first purchase)
     */
    function purchaseLevel(uint256 _level, address _referrer) external nonReentrant {
        require(_level >= 1 && _level <= MAX_LEVEL, "Invalid level");
        require(levels[_level].active, "Level not active");
        require(_level > memberLevel[msg.sender], "Must upgrade to higher level");

        Level memory lvl = levels[_level];

        // First-time buyers must have a valid referrer
        if (memberLevel[msg.sender] == 0) {
            require(
                _referrer != address(0) && _referrer != msg.sender,
                "Invalid referrer"
            );
            referrer[msg.sender] = _referrer;
        }

        // Transfer USDT from buyer to contract
        require(
            usdtToken.transferFrom(msg.sender, address(this), lvl.priceUSDT),
            "USDT transfer failed"
        );

        uint256 previousLevel = memberLevel[msg.sender];
        memberLevel[msg.sender] = _level;

        // Mint membership NFT
        _mint(msg.sender, _level, 1, "");

        // Process direct sponsor reward for first purchase (Level 1)
        if (previousLevel == 0 && referrer[msg.sender] != address(0)) {
            _payDirectSponsor(referrer[msg.sender], msg.sender);
        }

        // Notify rewards contract for layer reward processing
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

    /**
     * @dev Pay direct sponsor reward
     * @param _sponsor Sponsor address
     * @param _buyer New member address
     */
    function _payDirectSponsor(address _sponsor, address _buyer) internal {
        // Only pay if sponsor is activated (Level >= 1)
        if (memberLevel[_sponsor] >= 1) {
            bool success = usdtToken.transfer(_sponsor, directSponsorReward);
            if (success) {
                emit DirectSponsorPaid(_sponsor, _buyer, directSponsorReward);
            }
        }
        // If sponsor is not activated, reward stays in contract (pending)
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set the rewards contract address
     * @param _rewards New rewards contract address
     */
    function setRewardsContract(address _rewards) external onlyOwner {
        address oldContract = rewardsContract;
        rewardsContract = _rewards;
        emit RewardsContractUpdated(oldContract, _rewards);
    }

    /**
     * @notice Update level price
     * @param _level Level number
     * @param _price New price in USDT (6 decimals)
     */
    function setLevelPrice(uint256 _level, uint256 _price) external onlyOwner {
        require(_level >= 1 && _level <= MAX_LEVEL, "Invalid level");
        levels[_level].priceUSDT = _price;
    }

    /**
     * @notice Update direct sponsor reward amount
     * @param _amount New reward amount in USDT (6 decimals)
     */
    function setDirectSponsorReward(uint256 _amount) external onlyOwner {
        directSponsorReward = _amount;
    }

    /**
     * @notice Toggle level active status
     * @param _level Level number
     * @param _active Active status
     */
    function setLevelActive(uint256 _level, bool _active) external onlyOwner {
        require(_level >= 1 && _level <= MAX_LEVEL, "Invalid level");
        levels[_level].active = _active;
    }

    /**
     * @notice Update platform wallet
     * @param _wallet New platform wallet address
     */
    function setPlatformWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet address");
        platformWallet = _wallet;
    }

    /**
     * @notice Withdraw specific amount of USDT
     * @param _amount Amount to withdraw
     */
    function withdrawUSDT(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(
            usdtToken.transfer(platformWallet, _amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Withdraw all USDT balance
     */
    function withdrawAll() external onlyOwner {
        uint256 balance = usdtToken.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        require(
            usdtToken.transfer(platformWallet, balance),
            "Transfer failed"
        );
    }

    /**
     * @notice Update base URI for token metadata
     * @param _newURI New base URI
     */
    function setBaseURI(string memory _newURI) external onlyOwner {
        baseURI = _newURI;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get level information
     * @param _level Level number
     * @return Level struct with all info
     */
    function getLevelInfo(uint256 _level) external view returns (Level memory) {
        require(_level >= 1 && _level <= MAX_LEVEL, "Invalid level");
        return levels[_level];
    }

    /**
     * @notice Get member information
     * @param _member Member address
     * @return level Current level
     * @return ref Referrer address
     * @return ownedTokens Array of owned NFT balances per level
     */
    function getMemberInfo(address _member) external view returns (
        uint256 level,
        address ref,
        uint256[] memory ownedTokens
    ) {
        level = memberLevel[_member];
        ref = referrer[_member];

        // Get all owned level NFTs
        ownedTokens = new uint256[](MAX_LEVEL);
        for (uint256 i = 1; i <= MAX_LEVEL; i++) {
            ownedTokens[i - 1] = balanceOf(_member, i);
        }
    }

    /**
     * @notice Get USDT balance of contract
     * @return Contract's USDT balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    /**
     * @notice Override URI to return level-specific metadata
     * @param _tokenId Token ID (level number)
     * @return Token metadata URI
     */
    function uri(uint256 _tokenId) public view override returns (string memory) {
        require(_tokenId >= 1 && _tokenId <= MAX_LEVEL, "Invalid token ID");
        return string(abi.encodePacked(baseURI, _tokenId.toString()));
    }
}

/**
 * @title IBeehiveRewards
 * @notice Interface for the BeehiveRewards contract
 */
interface IBeehiveRewards {
    function processLayerReward(address member, uint256 level, uint256 amount) external;
}

