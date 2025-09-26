// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TraceToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title RewardsDistributor
 * @dev Manages off-chain TracePoints and on-chain $TRACE conversions
 * @notice This contract handles the distribution of rewards based on user actions
 */
contract RewardsDistributor is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    TraceToken public immutable traceToken;
    AggregatorV3Interface public priceFeed;
    
    // Reward tracking
    mapping(address => uint256) public userRewardBalance;
    mapping(address => mapping(string => uint256)) public categoryRewards;
    mapping(address => uint256) public lastRewardClaim;
    mapping(address => bool) public authorizedProcessors;
    
    // Anti-gaming mechanisms
    mapping(address => uint256) public lastActionTimestamp;
    mapping(address => uint256) public dailyActionCount;
    mapping(address => uint256) public lastDailyReset;
    
    // Reward limits and rates
    uint256 public constant MAX_DAILY_REWARDS = 1000 * 10**18; // 1000 TRACE per day
    uint256 public constant MIN_ACTION_INTERVAL = 60; // 1 minute between actions
    uint256 public constant DAILY_ACTION_LIMIT = 100; // Max 100 actions per day
    
    // Reward categories and rates
    mapping(string => uint256) public rewardRates;
    mapping(string => bool) public activeCategories;
    
    // Events
    event RewardAccrued(address indexed user, uint256 amount, string category);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(string category, uint256 newRate);
    event CategoryToggled(string category, bool active);
    event ProcessorAuthorized(address indexed processor, bool authorized);
    event SuspiciousActivityDetected(address indexed user, string reason);
    
    modifier onlyAuthorizedProcessor() {
        require(authorizedProcessors[msg.sender] || msg.sender == owner(), "Not authorized processor");
        _;
    }
    
    modifier validAction(address user, string memory category) {
        require(activeCategories[category], "Category not active");
        require(_isValidAction(user), "Action not valid");
        _;
    }
    
    constructor(address _traceToken, address _priceFeed) {
        require(_traceToken != address(0), "Invalid token address");
        require(_priceFeed != address(0), "Invalid price feed address");
        
        traceToken = TraceToken(_traceToken);
        priceFeed = AggregatorV3Interface(_priceFeed);
        
        // Initialize reward rates
        _initializeRewardRates();
        
        // Authorize owner as processor
        authorizedProcessors[owner()] = true;
    }
    
    /**
     * @dev Process a user action and calculate rewards
     * @param user Address of the user
     * @param action Action performed
     * @param metadata Additional metadata for the action
     */
    function processUserAction(
        address user,
        string memory action,
        bytes memory metadata
    ) external onlyAuthorizedProcessor validAction(user, action) nonReentrant whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(bytes(action).length > 0, "Action required");
        
        // Update action tracking
        _updateActionTracking(user);
        
        // Calculate reward amount
        uint256 rewardAmount = _calculateReward(action, metadata);
        
        if (rewardAmount > 0) {
            // Check daily limits
            require(
                userRewardBalance[user].add(rewardAmount) <= MAX_DAILY_REWARDS,
                "Daily reward limit exceeded"
            );
            
            // Accrue rewards
            userRewardBalance[user] = userRewardBalance[user].add(rewardAmount);
            categoryRewards[user][action] = categoryRewards[user][action].add(rewardAmount);
            
            emit RewardAccrued(user, rewardAmount, action);
        }
    }
    
    /**
     * @dev Batch process multiple user actions
     * @param users Array of user addresses
     * @param actions Array of actions
     * @param metadataArray Array of metadata
     */
    function batchProcessActions(
        address[] memory users,
        string[] memory actions,
        bytes[] memory metadataArray
    ) external onlyAuthorizedProcessor nonReentrant whenNotPaused {
        require(users.length == actions.length, "Array length mismatch");
        require(actions.length == metadataArray.length, "Array length mismatch");
        require(users.length <= 50, "Batch size too large");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (_isValidAction(users[i]) && activeCategories[actions[i]]) {
                _updateActionTracking(users[i]);
                uint256 rewardAmount = _calculateReward(actions[i], metadataArray[i]);
                
                if (rewardAmount > 0 && userRewardBalance[users[i]].add(rewardAmount) <= MAX_DAILY_REWARDS) {
                    userRewardBalance[users[i]] = userRewardBalance[users[i]].add(rewardAmount);
                    categoryRewards[users[i]][actions[i]] = categoryRewards[users[i]][actions[i]].add(rewardAmount);
                    
                    emit RewardAccrued(users[i], rewardAmount, actions[i]);
                }
            }
        }
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant whenNotPaused {
        uint256 totalReward = userRewardBalance[msg.sender];
        require(totalReward > 0, "No rewards to claim");
        
        userRewardBalance[msg.sender] = 0;
        lastRewardClaim[msg.sender] = block.timestamp;
        
        // Transfer tokens from treasury
        traceToken.distributeReward(msg.sender, totalReward, "claim");
        
        emit RewardsClaimed(msg.sender, totalReward);
    }
    
    /**
     * @dev Calculate reward amount for an action
     * @param action Action performed
     * @param metadata Additional metadata
     * @return amount Reward amount
     */
    function _calculateReward(string memory action, bytes memory metadata) internal view returns (uint256 amount) {
        // Base reward rate
        uint256 baseRate = rewardRates[action];
        if (baseRate == 0) {
            return 0;
        }
        
        // Parse metadata for additional factors
        (uint256 multiplier, uint256 bonus) = _parseMetadata(metadata);
        
        // Calculate final amount
        amount = baseRate.mul(multiplier).div(100).add(bonus);
        
        // Apply daily cap
        if (amount > MAX_DAILY_REWARDS) {
            amount = MAX_DAILY_REWARDS;
        }
    }
    
    /**
     * @dev Parse metadata for reward calculation
     * @param metadata Raw metadata bytes
     * @return multiplier Percentage multiplier (100 = 100%)
     * @return bonus Additional bonus amount
     */
    function _parseMetadata(bytes memory metadata) internal pure returns (uint256 multiplier, uint256 bonus) {
        if (metadata.length == 0) {
            return (100, 0); // Default 100% multiplier, no bonus
        }
        
        // Simple parsing - in production, use more sophisticated decoding
        if (metadata.length >= 32) {
            assembly {
                multiplier := mload(add(metadata, 32))
                bonus := mload(add(metadata, 64))
            }
        } else {
            multiplier = 100;
            bonus = 0;
        }
    }
    
    /**
     * @dev Check if an action is valid (anti-gaming)
     * @param user Address of the user
     * @return valid Whether the action is valid
     */
    function _isValidAction(address user) internal view returns (bool valid) {
        // Check minimum interval between actions
        if (block.timestamp.sub(lastActionTimestamp[user]) < MIN_ACTION_INTERVAL) {
            return false;
        }
        
        // Check daily action limit
        if (lastDailyReset[user] != 0 && block.timestamp.sub(lastDailyReset[user]) < 1 days) {
            if (dailyActionCount[user] >= DAILY_ACTION_LIMIT) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Update action tracking for anti-gaming
     * @param user Address of the user
     */
    function _updateActionTracking(address user) internal {
        // Reset daily count if new day
        if (lastDailyReset[user] == 0 || block.timestamp.sub(lastDailyReset[user]) >= 1 days) {
            dailyActionCount[user] = 0;
            lastDailyReset[user] = block.timestamp;
        }
        
        dailyActionCount[user] = dailyActionCount[user].add(1);
        lastActionTimestamp[user] = block.timestamp;
    }
    
    /**
     * @dev Initialize default reward rates
     */
    function _initializeRewardRates() internal {
        // Onboarding rewards
        rewardRates["onboarding"] = 100 * 10**18;
        activeCategories["onboarding"] = true;
        
        // Usage rewards
        rewardRates["first_trace"] = 250 * 10**18;
        activeCategories["first_trace"] = true;
        
        rewardRates["monthly_usage"] = 1 * 10**18; // Per 10 items
        activeCategories["monthly_usage"] = true;
        
        // Referral rewards
        rewardRates["referral"] = 500 * 10**18;
        activeCategories["referral"] = true;
        
        // Data contribution rewards
        rewardRates["data_contribution"] = 10 * 10**18;
        activeCategories["data_contribution"] = true;
        
        // Quality rewards
        rewardRates["quality_improvement"] = 50 * 10**18;
        activeCategories["quality_improvement"] = true;
        
        // Community rewards
        rewardRates["community_engagement"] = 25 * 10**18;
        activeCategories["community_engagement"] = true;
    }
    
    /**
     * @dev Set reward rate for a category
     * @param category Category name
     * @param rate New reward rate
     */
    function setRewardRate(string memory category, uint256 rate) external onlyOwner {
        require(bytes(category).length > 0, "Category required");
        require(rate <= MAX_DAILY_REWARDS, "Rate too high");
        
        rewardRates[category] = rate;
        emit RewardRateUpdated(category, rate);
    }
    
    /**
     * @dev Toggle category active status
     * @param category Category name
     * @param active Whether to activate or deactivate
     */
    function toggleCategory(string memory category, bool active) external onlyOwner {
        require(bytes(category).length > 0, "Category required");
        
        activeCategories[category] = active;
        emit CategoryToggled(category, active);
    }
    
    /**
     * @dev Authorize or deauthorize a processor
     * @param processor Address of the processor
     * @param authorized Whether to authorize or deauthorize
     */
    function setProcessor(address processor, bool authorized) external onlyOwner {
        require(processor != address(0), "Invalid processor address");
        authorizedProcessors[processor] = authorized;
        emit ProcessorAuthorized(processor, authorized);
    }
    
    /**
     * @dev Get user's reward information
     * @param user Address of the user
     * @return balance Current reward balance
     * @return lastClaim Timestamp of last claim
     * @return dailyActions Number of actions today
     */
    function getUserInfo(address user) external view returns (
        uint256 balance,
        uint256 lastClaim,
        uint256 dailyActions
    ) {
        balance = userRewardBalance[user];
        lastClaim = lastRewardClaim[user];
        
        if (lastDailyReset[user] != 0 && block.timestamp.sub(lastDailyReset[user]) < 1 days) {
            dailyActions = dailyActionCount[user];
        } else {
            dailyActions = 0;
        }
    }
    
    /**
     * @dev Get reward rate for a category
     * @param category Category name
     * @return rate Current reward rate
     * @return active Whether category is active
     */
    function getCategoryInfo(string memory category) external view returns (uint256 rate, bool active) {
        rate = rewardRates[category];
        active = activeCategories[category];
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Detect and handle suspicious activity
     * @param user Address of the user
     * @param reason Reason for suspicion
     */
    function flagSuspiciousActivity(address user, string memory reason) external onlyAuthorizedProcessor {
        require(user != address(0), "Invalid user address");
        require(bytes(reason).length > 0, "Reason required");
        
        // Reset user's daily actions and rewards
        dailyActionCount[user] = 0;
        lastDailyReset[user] = block.timestamp;
        
        emit SuspiciousActivityDetected(user, reason);
    }
}
