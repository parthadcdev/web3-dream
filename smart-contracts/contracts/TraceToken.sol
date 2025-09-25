// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title TraceToken
 * @dev $TRACE utility token with gamified rewards system, staking, and governance features
 * @notice This contract implements the core $TRACE token for the TraceChain ecosystem
 */
contract TraceToken is ERC20Capped, Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // Token Configuration
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant ECOSYSTEM_FUND = 200_000_000 * 10**18; // 20%
    uint256 public constant TEAM_ALLOCATION = 100_000_000 * 10**18; // 10%
    uint256 public constant TREASURY_ALLOCATION = 100_000_000 * 10**18; // 10%
    
    // Reward Categories
    uint256 public constant ONBOARDING_BONUS = 100 * 10**18;
    uint256 public constant FIRST_TRACE_BONUS = 250 * 10**18;
    uint256 public constant USAGE_REWARD_RATE = 1 * 10**18; // Per 10 items
    uint256 public constant REFERRAL_BONUS = 500 * 10**18;
    uint256 public constant DATA_CONTRIBUTION_BASE = 10 * 10**18;
    
    // Staking Configuration
    uint256 public constant MIN_STAKE_AMOUNT = 1000 * 10**18; // 1000 TRACE minimum
    uint256 public constant STAKING_LOCK_PERIOD = 7 days;
    uint256 public constant STAKING_REWARD_RATE = 5; // 5% APY
    
    // Staking and Governance
    struct StakingInfo {
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        uint256 lastRewardClaim;
        uint256 totalRewardsEarned;
    }
    
    mapping(address => StakingInfo) public stakingInfo;
    mapping(address => uint256) public userRewardBalance;
    mapping(address => mapping(string => uint256)) public categoryRewards;
    mapping(address => bool) public authorizedDistributors;
    
    // Vesting
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 released;
        uint256 startTime;
        uint256 duration;
        bool revocable;
    }
    
    mapping(address => VestingSchedule) public vestingSchedules;
    
    // Events
    event RewardDistributed(address indexed recipient, uint256 amount, string category);
    event TokensStaked(address indexed staker, uint256 amount);
    event TokensUnstaked(address indexed staker, uint256 amount);
    event StakingRewardsClaimed(address indexed staker, uint256 amount);
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint256 duration);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event DistributorAuthorized(address indexed distributor, bool authorized);
    
    modifier onlyAuthorizedDistributor() {
        require(authorizedDistributors[msg.sender] || msg.sender == owner(), "Not authorized distributor");
        _;
    }
    
    constructor() ERC20("TraceChain Token", "TRACE") ERC20Capped(MAX_SUPPLY) {
        // Mint ecosystem fund to contract
        _mint(address(this), ECOSYSTEM_FUND);
        
        // Mint team allocation to owner (will be distributed later)
        _mint(owner(), TEAM_ALLOCATION);
        
        // Mint treasury allocation to contract
        _mint(address(this), TREASURY_ALLOCATION);
        
        // Authorize owner as distributor
        authorizedDistributors[owner()] = true;
    }
    
    /**
     * @dev Distribute reward tokens to a recipient
     * @param recipient Address to receive the reward
     * @param amount Amount of tokens to distribute
     * @param category Category of the reward (onboarding, usage, referral, etc.)
     */
    function distributeReward(
        address recipient, 
        uint256 amount, 
        string memory category
    ) external onlyAuthorizedDistributor nonReentrant whenNotPaused {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be positive");
        require(balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        require(bytes(category).length > 0, "Category required");
        
        _transfer(address(this), recipient, amount);
        userRewardBalance[recipient] = userRewardBalance[recipient].add(amount);
        categoryRewards[recipient][category] = categoryRewards[recipient][category].add(amount);
        
        emit RewardDistributed(recipient, amount, category);
    }
    
    /**
     * @dev Stake tokens to earn rewards and unlock benefits
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum stake");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Claim any pending staking rewards first
        if (stakingInfo[msg.sender].stakedAmount > 0) {
            claimStakingRewards();
        }
        
        _transfer(msg.sender, address(this), amount);
        stakingInfo[msg.sender].stakedAmount = stakingInfo[msg.sender].stakedAmount.add(amount);
        stakingInfo[msg.sender].stakingTimestamp = block.timestamp;
        stakingInfo[msg.sender].lastRewardClaim = block.timestamp;
        
        emit TokensStaked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens after lock period
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(stakingInfo[msg.sender].stakedAmount >= amount, "Insufficient staked amount");
        require(
            block.timestamp >= stakingInfo[msg.sender].stakingTimestamp.add(STAKING_LOCK_PERIOD),
            "Staking period not completed"
        );
        
        // Claim any pending rewards first
        claimStakingRewards();
        
        stakingInfo[msg.sender].stakedAmount = stakingInfo[msg.sender].stakedAmount.sub(amount);
        _transfer(address(this), msg.sender, amount);
        
        emit TokensUnstaked(msg.sender, amount);
    }
    
    /**
     * @dev Claim accumulated staking rewards
     */
    function claimStakingRewards() public nonReentrant whenNotPaused {
        uint256 rewards = calculateStakingRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        
        stakingInfo[msg.sender].lastRewardClaim = block.timestamp;
        stakingInfo[msg.sender].totalRewardsEarned = stakingInfo[msg.sender].totalRewardsEarned.add(rewards);
        
        _transfer(address(this), msg.sender, rewards);
        
        emit StakingRewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Calculate staking rewards for a user
     * @param staker Address of the staker
     * @return rewards Amount of rewards earned
     */
    function calculateStakingRewards(address staker) public view returns (uint256 rewards) {
        StakingInfo memory info = stakingInfo[staker];
        if (info.stakedAmount == 0 || info.lastRewardClaim == 0) {
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp.sub(info.lastRewardClaim);
        uint256 annualReward = info.stakedAmount.mul(STAKING_REWARD_RATE).div(100);
        rewards = annualReward.mul(timeElapsed).div(365 days);
    }
    
    /**
     * @dev Get staking benefits based on staked amount
     * @param staker Address of the staker
     * @return benefits Level of benefits (0-3)
     */
    function getStakingBenefits(address staker) external view returns (uint256 benefits) {
        uint256 staked = stakingInfo[staker].stakedAmount;
        if (staked >= 10000 * 10**18) return 3; // Premium support
        if (staked >= 5000 * 10**18) return 2;  // Higher API limits
        if (staked >= 1000 * 10**18) return 1;  // Priority features
        return 0;
    }
    
    /**
     * @dev Create a vesting schedule for tokens
     * @param beneficiary Address to receive vested tokens
     * @param amount Total amount to vest
     * @param duration Vesting duration in seconds
     * @param revocable Whether the vesting can be revoked
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 duration,
        bool revocable
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be positive");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting already exists");
        require(balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            released: 0,
            startTime: block.timestamp,
            duration: duration,
            revocable: revocable
        });
        
        emit VestingScheduleCreated(beneficiary, amount, duration);
    }
    
    /**
     * @dev Release vested tokens to beneficiary
     * @param beneficiary Address to release tokens to
     */
    function releaseVestedTokens(address beneficiary) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        
        uint256 releasableAmount = getReleasableAmount(beneficiary);
        require(releasableAmount > 0, "No tokens to release");
        
        schedule.released = schedule.released.add(releasableAmount);
        _transfer(address(this), beneficiary, releasableAmount);
        
        emit TokensReleased(beneficiary, releasableAmount);
    }
    
    /**
     * @dev Calculate releasable amount for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return amount Releasable amount
     */
    function getReleasableAmount(address beneficiary) public view returns (uint256 amount) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) {
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp.sub(schedule.startTime);
        if (timeElapsed >= schedule.duration) {
            amount = schedule.totalAmount.sub(schedule.released);
        } else {
            amount = schedule.totalAmount.mul(timeElapsed).div(schedule.duration).sub(schedule.released);
        }
    }
    
    /**
     * @dev Authorize or deauthorize a distributor
     * @param distributor Address of the distributor
     * @param authorized Whether to authorize or deauthorize
     */
    function setDistributor(address distributor, bool authorized) external onlyOwner {
        require(distributor != address(0), "Invalid distributor address");
        authorizedDistributors[distributor] = authorized;
        emit DistributorAuthorized(distributor, authorized);
    }
    
    /**
     * @dev Get user's total reward balance across all categories
     * @param user Address of the user
     * @return balance Total reward balance
     */
    function getUserRewardBalance(address user) external view returns (uint256 balance) {
        return userRewardBalance[user];
    }
    
    /**
     * @dev Get user's rewards by category
     * @param user Address of the user
     * @param category Category to check
     * @return amount Amount earned in this category
     */
    function getCategoryRewards(address user, string memory category) external view returns (uint256 amount) {
        return categoryRewards[user][category];
    }
    
    /**
     * @dev Get comprehensive staking information for a user
     * @param user Address of the user
     * @return info Complete staking information
     */
    function getStakingInfo(address user) external view returns (StakingInfo memory info) {
        return stakingInfo[user];
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
     * @dev Override _beforeTokenTransfer to add pausable functionality
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    /**
     * @dev Override _mint to respect the cap
     */
    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Capped) {
        super._mint(to, amount);
    }
}
