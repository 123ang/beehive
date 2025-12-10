// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title BeehiveRewards
 * @notice Handles reward distribution for the Beehive platform
 * @dev Manages layer payouts and pending rewards
 */
contract BeehiveRewards is Ownable, ReentrancyGuard {
    // Token contracts
    IERC20 public usdtToken;
    IERC20 public bccToken;
    address public membershipContract;

    // Layer reward configuration (level => USDT amount in 6 decimals)
    mapping(uint256 => uint256) public layerRewardAmount;

    // Pending rewards for users
    mapping(address => uint256) public pendingRewardsUSDT;
    mapping(address => uint256) public pendingRewardsBCC;

    // Claimed rewards tracking
    mapping(address => uint256) public claimedRewardsUSDT;
    mapping(address => uint256) public claimedRewardsBCC;

    // Events
    event LayerRewardProcessed(
        address indexed member,
        address indexed upline,
        uint256 level,
        uint256 layerDepth,
        uint256 amount
    );
    event RewardClaimed(address indexed member, uint256 usdtAmount, uint256 bccAmount);
    event RewardDistributed(
        address indexed recipient,
        uint256 usdtAmount,
        uint256 bccAmount,
        string rewardType
    );
    event MembershipContractUpdated(address indexed oldContract, address indexed newContract);
    event BCCTokenUpdated(address indexed oldToken, address indexed newToken);

    /**
     * @notice Constructor
     * @param _usdtToken USDT token contract address
     */
    constructor(address _usdtToken) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT address");
        usdtToken = IERC20(_usdtToken);

        // Initialize layer reward amounts (USDT with 6 decimals)
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

    /**
     * @notice Modifier to restrict calls to membership contract
     */
    modifier onlyMembershipContract() {
        require(msg.sender == membershipContract, "Only membership contract");
        _;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set the membership contract address
     * @param _membership Membership contract address
     */
    function setMembershipContract(address _membership) external onlyOwner {
        address oldContract = membershipContract;
        membershipContract = _membership;
        emit MembershipContractUpdated(oldContract, _membership);
    }

    /**
     * @notice Set the BCC token contract address
     * @param _bccToken BCC token contract address
     */
    function setBCCToken(address _bccToken) external onlyOwner {
        address oldToken = address(bccToken);
        bccToken = IERC20(_bccToken);
        emit BCCTokenUpdated(oldToken, _bccToken);
    }

    /**
     * @notice Update layer reward amount
     * @param _level Level number
     * @param _amount New reward amount in USDT (6 decimals)
     */
    function setLayerRewardAmount(uint256 _level, uint256 _amount) external onlyOwner {
        require(_level >= 2 && _level <= 19, "Invalid level");
        layerRewardAmount[_level] = _amount;
    }

    // ============================================
    // REWARD PROCESSING
    // ============================================

    /**
     * @notice Process layer reward (called by Membership contract)
     * @dev Actual layer distribution is handled by backend
     * @param member Member who purchased the level
     * @param level Level purchased
     * @param amount Amount paid (unused, kept for interface compatibility)
     */
    function processLayerReward(
        address member,
        uint256 level,
        uint256 amount
    ) external onlyMembershipContract {
        // Layer reward logic is processed in backend
        // This function serves as a hook for on-chain events
        emit LayerRewardProcessed(member, address(0), level, 0, amount);
    }

    /**
     * @notice Distribute reward to a single recipient (admin function)
     * @param _recipient Recipient address
     * @param _usdtAmount USDT reward amount
     * @param _bccAmount BCC reward amount
     */
    function distributeReward(
        address _recipient,
        uint256 _usdtAmount,
        uint256 _bccAmount
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");

        if (_usdtAmount > 0) {
            pendingRewardsUSDT[_recipient] += _usdtAmount;
        }
        if (_bccAmount > 0) {
            pendingRewardsBCC[_recipient] += _bccAmount;
        }

        emit RewardDistributed(_recipient, _usdtAmount, _bccAmount, "admin");
    }

    /**
     * @notice Batch distribute rewards (admin function)
     * @param _recipients Array of recipient addresses
     * @param _usdtAmounts Array of USDT amounts
     * @param _bccAmounts Array of BCC amounts
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
            if (_recipients[i] == address(0)) continue;

            if (_usdtAmounts[i] > 0) {
                pendingRewardsUSDT[_recipients[i]] += _usdtAmounts[i];
            }
            if (_bccAmounts[i] > 0) {
                pendingRewardsBCC[_recipients[i]] += _bccAmounts[i];
            }

            emit RewardDistributed(_recipients[i], _usdtAmounts[i], _bccAmounts[i], "batch");
        }
    }

    // ============================================
    // USER FUNCTIONS
    // ============================================

    /**
     * @notice Claim all pending rewards
     */
    function claimRewards() external nonReentrant {
        uint256 usdtAmount = pendingRewardsUSDT[msg.sender];
        uint256 bccAmount = pendingRewardsBCC[msg.sender];

        require(usdtAmount > 0 || bccAmount > 0, "No rewards to claim");

        // Process USDT rewards
        if (usdtAmount > 0) {
            pendingRewardsUSDT[msg.sender] = 0;
            claimedRewardsUSDT[msg.sender] += usdtAmount;
            
            require(
                usdtToken.transfer(msg.sender, usdtAmount),
                "USDT transfer failed"
            );
        }

        // Process BCC rewards
        if (bccAmount > 0 && address(bccToken) != address(0)) {
            pendingRewardsBCC[msg.sender] = 0;
            claimedRewardsBCC[msg.sender] += bccAmount;
            
            require(
                bccToken.transfer(msg.sender, bccAmount),
                "BCC transfer failed"
            );
        }

        emit RewardClaimed(msg.sender, usdtAmount, bccAmount);
    }

    /**
     * @notice Claim only USDT rewards
     */
    function claimUSDTRewards() external nonReentrant {
        uint256 usdtAmount = pendingRewardsUSDT[msg.sender];
        require(usdtAmount > 0, "No USDT rewards to claim");

        pendingRewardsUSDT[msg.sender] = 0;
        claimedRewardsUSDT[msg.sender] += usdtAmount;

        require(
            usdtToken.transfer(msg.sender, usdtAmount),
            "USDT transfer failed"
        );

        emit RewardClaimed(msg.sender, usdtAmount, 0);
    }

    /**
     * @notice Claim only BCC rewards
     */
    function claimBCCRewards() external nonReentrant {
        require(address(bccToken) != address(0), "BCC token not set");
        
        uint256 bccAmount = pendingRewardsBCC[msg.sender];
        require(bccAmount > 0, "No BCC rewards to claim");

        pendingRewardsBCC[msg.sender] = 0;
        claimedRewardsBCC[msg.sender] += bccAmount;

        require(
            bccToken.transfer(msg.sender, bccAmount),
            "BCC transfer failed"
        );

        emit RewardClaimed(msg.sender, 0, bccAmount);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get reward information for a member
     * @param _member Member address
     * @return pendingUSDT Pending USDT rewards
     * @return pendingBCC Pending BCC rewards
     * @return claimedUSDT Total claimed USDT
     * @return claimedBCC Total claimed BCC
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
     * @notice Get layer reward amount for a level
     * @param _level Level number
     * @return Reward amount in USDT (6 decimals)
     */
    function getLayerRewardAmount(uint256 _level) external view returns (uint256) {
        return layerRewardAmount[_level];
    }

    /**
     * @notice Get contract USDT balance
     * @return USDT balance
     */
    function getUSDTBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    /**
     * @notice Get contract BCC balance
     * @return BCC balance
     */
    function getBCCBalance() external view returns (uint256) {
        if (address(bccToken) == address(0)) return 0;
        return bccToken.balanceOf(address(this));
    }

    // ============================================
    // FUND MANAGEMENT
    // ============================================

    /**
     * @notice Deposit USDT into contract for reward distribution
     * @param _amount Amount to deposit
     */
    function depositUSDT(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(
            usdtToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Deposit BCC into contract for reward distribution
     * @param _amount Amount to deposit
     */
    function depositBCC(uint256 _amount) external {
        require(address(bccToken) != address(0), "BCC token not set");
        require(_amount > 0, "Amount must be greater than 0");
        require(
            bccToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Emergency withdraw function
     * @param _token Token address to withdraw
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        IERC20(_token).transfer(owner(), _amount);
    }
}

