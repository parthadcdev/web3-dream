// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title AccessControl
 * @dev Comprehensive access control system with role-based permissions and multi-signature requirements
 * @notice This contract manages roles, permissions, and multi-signature requirements for the TraceChain ecosystem
 */
contract TraceAccessControl is AccessControl, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant PAYMENT_ROLE = keccak256("PAYMENT_ROLE");
    bytes32 public constant REWARDS_ROLE = keccak256("REWARDS_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Multi-signature configuration
    struct MultiSigConfig {
        uint256 requiredSignatures;
        uint256 timeoutDuration;
        bool isActive;
        mapping(address => bool) signers;
        address[] signerList;
    }
    
    // Multi-signature proposals
    struct MultiSigProposal {
        bytes32 proposalId;
        address proposer;
        address target;
        bytes data;
        uint256 value;
        uint256 createdAt;
        uint256 expiresAt;
        bool executed;
        mapping(address => bool) signatures;
        address[] signerList;
        uint256 signatureCount;
    }
    
    // Role permissions
    struct RolePermissions {
        bool canPause;
        bool canUnpause;
        bool canUpgrade;
        bool canMint;
        bool canBurn;
        bool canTransfer;
        bool canApprove;
        bool canSetRole;
        bool canEmergencyAction;
        uint256 maxAmount; // Maximum amount for operations
        uint256 dailyLimit; // Daily operation limit
    }
    
    // User activity tracking
    struct UserActivity {
        uint256 lastActivity;
        uint256 dailyOperations;
        uint256 dailyAmount;
        uint256 lastDailyReset;
        uint256 totalOperations;
        uint256 totalAmount;
    }
    
    // Mappings
    mapping(bytes32 => MultiSigConfig) public multiSigConfigs;
    mapping(bytes32 => MultiSigProposal) public multiSigProposals;
    mapping(bytes32 => RolePermissions) public rolePermissions;
    mapping(address => UserActivity) public userActivity;
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => uint256) public addressLimits;
    
    // Arrays for iteration
    bytes32[] public activeMultiSigConfigs;
    bytes32[] public pendingProposals;
    
    // Configuration
    uint256 public constant MAX_DAILY_OPERATIONS = 1000;
    uint256 public constant MAX_DAILY_AMOUNT = 1000000 * 10**18; // 1M tokens
    uint256 public constant MIN_MULTISIG_SIGNATURES = 2;
    uint256 public constant MAX_MULTISIG_SIGNATURES = 10;
    uint256 public constant DEFAULT_TIMEOUT = 7 days;
    
    // Events
    event MultiSigConfigCreated(bytes32 indexed configId, uint256 requiredSignatures, address[] signers);
    event MultiSigProposalCreated(bytes32 indexed proposalId, address indexed proposer, address target);
    event MultiSigProposalSigned(bytes32 indexed proposalId, address indexed signer);
    event MultiSigProposalExecuted(bytes32 indexed proposalId, bool success);
    event RolePermissionsUpdated(bytes32 indexed role, RolePermissions permissions);
    event AddressBlacklisted(address indexed account, bool blacklisted);
    event AddressLimitUpdated(address indexed account, uint256 limit);
    event UserActivityUpdated(address indexed user, uint256 operations, uint256 amount);
    
    modifier onlyMultiSig(bytes32 configId) {
        require(multiSigConfigs[configId].isActive, "Multi-sig config not active");
        require(multiSigConfigs[configId].signers[msg.sender], "Not a multi-sig signer");
        _;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklistedAddresses[account], "Address is blacklisted");
        _;
    }
    
    modifier withinLimits(address account, uint256 amount) {
        require(amount <= addressLimits[account], "Amount exceeds limit");
        _;
    }
    
    modifier checkDailyLimits(address account, uint256 amount) {
        UserActivity storage activity = userActivity[account];
        
        // Reset daily counters if new day
        if (activity.lastDailyReset == 0 || block.timestamp.sub(activity.lastDailyReset) >= 1 days) {
            activity.dailyOperations = 0;
            activity.dailyAmount = 0;
            activity.lastDailyReset = block.timestamp;
        }
        
        require(activity.dailyOperations < MAX_DAILY_OPERATIONS, "Daily operation limit exceeded");
        require(activity.dailyAmount.add(amount) <= MAX_DAILY_AMOUNT, "Daily amount limit exceeded");
        
        _;
        
        // Update activity tracking
        activity.lastActivity = block.timestamp;
        activity.dailyOperations = activity.dailyOperations.add(1);
        activity.dailyAmount = activity.dailyAmount.add(amount);
        activity.totalOperations = activity.totalOperations.add(1);
        activity.totalAmount = activity.totalAmount.add(amount);
        
        emit UserActivityUpdated(account, activity.dailyOperations, activity.dailyAmount);
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        // Initialize default role permissions
        _initializeDefaultPermissions();
    }
    
    /**
     * @dev Create a multi-signature configuration
     * @param configId Unique identifier for the configuration
     * @param requiredSignatures Number of signatures required
     * @param signers Array of signer addresses
     * @param timeoutDuration Timeout duration for proposals
     */
    function createMultiSigConfig(
        bytes32 configId,
        uint256 requiredSignatures,
        address[] memory signers,
        uint256 timeoutDuration
    ) external onlyRole(ADMIN_ROLE) {
        require(requiredSignatures >= MIN_MULTISIG_SIGNATURES, "Too few signatures required");
        require(requiredSignatures <= MAX_MULTISIG_SIGNATURES, "Too many signatures required");
        require(signers.length >= requiredSignatures, "Not enough signers");
        require(signers.length <= MAX_MULTISIG_SIGNATURES, "Too many signers");
        require(timeoutDuration > 0, "Invalid timeout duration");
        require(!multiSigConfigs[configId].isActive, "Config already exists");
        
        MultiSigConfig storage config = multiSigConfigs[configId];
        config.requiredSignatures = requiredSignatures;
        config.timeoutDuration = timeoutDuration;
        config.isActive = true;
        
        for (uint256 i = 0; i < signers.length; i++) {
            require(signers[i] != address(0), "Invalid signer address");
            require(!config.signers[signers[i]], "Duplicate signer");
            config.signers[signers[i]] = true;
            config.signerList.push(signers[i]);
        }
        
        activeMultiSigConfigs.push(configId);
        
        emit MultiSigConfigCreated(configId, requiredSignatures, signers);
    }
    
    /**
     * @dev Create a multi-signature proposal
     * @param configId Multi-signature configuration ID
     * @param target Target contract address
     * @param data Calldata for the target contract
     * @param value ETH value to send
     * @return proposalId Unique proposal identifier
     */
    function createMultiSigProposal(
        bytes32 configId,
        address target,
        bytes memory data,
        uint256 value
    ) external onlyMultiSig(configId) returns (bytes32 proposalId) {
        require(target != address(0), "Invalid target address");
        require(data.length > 0, "Empty calldata");
        
        proposalId = keccak256(abi.encodePacked(configId, target, data, value, block.timestamp, msg.sender));
        
        MultiSigProposal storage proposal = multiSigProposals[proposalId];
        proposal.proposalId = proposalId;
        proposal.proposer = msg.sender;
        proposal.target = target;
        proposal.data = data;
        proposal.value = value;
        proposal.createdAt = block.timestamp;
        proposal.expiresAt = block.timestamp.add(multiSigConfigs[configId].timeoutDuration);
        proposal.executed = false;
        proposal.signatures[msg.sender] = true;
        proposal.signerList.push(msg.sender);
        proposal.signatureCount = 1;
        
        pendingProposals.push(proposalId);
        
        emit MultiSigProposalCreated(proposalId, msg.sender, target);
        
        return proposalId;
    }
    
    /**
     * @dev Sign a multi-signature proposal
     * @param proposalId Proposal identifier
     */
    function signMultiSigProposal(bytes32 proposalId) external {
        MultiSigProposal storage proposal = multiSigProposals[proposalId];
        require(proposal.proposalId != bytes32(0), "Proposal not found");
        require(!proposal.executed, "Proposal already executed");
        require(block.timestamp <= proposal.expiresAt, "Proposal expired");
        require(!proposal.signatures[msg.sender], "Already signed");
        
        // Find the multi-sig config for this proposal
        bytes32 configId = _findConfigForProposal(proposalId);
        require(multiSigConfigs[configId].signers[msg.sender], "Not authorized to sign");
        
        proposal.signatures[msg.sender] = true;
        proposal.signerList.push(msg.sender);
        proposal.signatureCount = proposal.signatureCount.add(1);
        
        emit MultiSigProposalSigned(proposalId, msg.sender);
    }
    
    /**
     * @dev Execute a multi-signature proposal
     * @param proposalId Proposal identifier
     */
    function executeMultiSigProposal(bytes32 proposalId) external {
        MultiSigProposal storage proposal = multiSigProposals[proposalId];
        require(proposal.proposalId != bytes32(0), "Proposal not found");
        require(!proposal.executed, "Proposal already executed");
        require(block.timestamp <= proposal.expiresAt, "Proposal expired");
        
        // Find the multi-sig config for this proposal
        bytes32 configId = _findConfigForProposal(proposalId);
        require(proposal.signatureCount >= multiSigConfigs[configId].requiredSignatures, "Insufficient signatures");
        
        proposal.executed = true;
        
        // Remove from pending proposals
        for (uint256 i = 0; i < pendingProposals.length; i++) {
            if (pendingProposals[i] == proposalId) {
                pendingProposals[i] = pendingProposals[pendingProposals.length - 1];
                pendingProposals.pop();
                break;
            }
        }
        
        // Execute the proposal
        (bool success, ) = proposal.target.call{value: proposal.value}(proposal.data);
        
        emit MultiSigProposalExecuted(proposalId, success);
    }
    
    /**
     * @dev Set role permissions
     * @param role Role identifier
     * @param permissions Permission structure
     */
    function setRolePermissions(bytes32 role, RolePermissions memory permissions) external onlyRole(ADMIN_ROLE) {
        rolePermissions[role] = permissions;
        emit RolePermissionsUpdated(role, permissions);
    }
    
    /**
     * @dev Blacklist or whitelist an address
     * @param account Address to blacklist/whitelist
     * @param blacklisted Whether to blacklist or whitelist
     */
    function setBlacklisted(address account, bool blacklisted) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        blacklistedAddresses[account] = blacklisted;
        emit AddressBlacklisted(account, blacklisted);
    }
    
    /**
     * @dev Set address limits
     * @param account Address to set limits for
     * @param limit Maximum amount for operations
     */
    function setAddressLimit(address account, uint256 limit) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        addressLimits[account] = limit;
        emit AddressLimitUpdated(account, limit);
    }
    
    /**
     * @dev Check if an address has permission for an operation
     * @param account Address to check
     * @param operation Operation identifier
     * @param amount Amount for the operation
     * @return hasPermission Whether the address has permission
     */
    function hasPermission(
        address account,
        string memory operation,
        uint256 amount
    ) external view returns (bool hasPermission) {
        if (blacklistedAddresses[account]) {
            return false;
        }
        
        if (amount > addressLimits[account] && addressLimits[account] > 0) {
            return false;
        }
        
        // Check role-based permissions
        bytes32[] memory roles = _getRolesForAccount(account);
        for (uint256 i = 0; i < roles.length; i++) {
            RolePermissions memory permissions = rolePermissions[roles[i]];
            if (_checkOperationPermission(permissions, operation, amount)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Get user activity information
     * @param account Address to check
     * @return activity User activity information
     */
    function getUserActivity(address account) external view returns (UserActivity memory activity) {
        return userActivity[account];
    }
    
    /**
     * @dev Get multi-signature configuration
     * @param configId Configuration identifier
     * @return requiredSignatures Number of required signatures
     * @return timeoutDuration Timeout duration
     * @return isActive Whether the configuration is active
     * @return signerList Array of signer addresses
     */
    function getMultiSigConfig(bytes32 configId) external view returns (
        uint256 requiredSignatures,
        uint256 timeoutDuration,
        bool isActive,
        address[] memory signerList
    ) {
        MultiSigConfig storage config = multiSigConfigs[configId];
        return (
            config.requiredSignatures,
            config.timeoutDuration,
            config.isActive,
            config.signerList
        );
    }
    
    /**
     * @dev Get multi-signature proposal
     * @param proposalId Proposal identifier
     * @return proposal Proposal information
     */
    function getMultiSigProposal(bytes32 proposalId) external view returns (
        bytes32 proposalId_,
        address proposer,
        address target,
        bytes memory data,
        uint256 value,
        uint256 createdAt,
        uint256 expiresAt,
        bool executed,
        address[] memory signerList,
        uint256 signatureCount
    ) {
        MultiSigProposal storage proposal = multiSigProposals[proposalId];
        return (
            proposal.proposalId,
            proposal.proposer,
            proposal.target,
            proposal.data,
            proposal.value,
            proposal.createdAt,
            proposal.expiresAt,
            proposal.executed,
            proposal.signerList,
            proposal.signatureCount
        );
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Initialize default role permissions
     */
    function _initializeDefaultPermissions() internal {
        // Admin role permissions
        rolePermissions[ADMIN_ROLE] = RolePermissions({
            canPause: true,
            canUnpause: true,
            canUpgrade: true,
            canMint: true,
            canBurn: true,
            canTransfer: true,
            canApprove: true,
            canSetRole: true,
            canEmergencyAction: true,
            maxAmount: type(uint256).max,
            dailyLimit: type(uint256).max
        });
        
        // Operator role permissions
        rolePermissions[OPERATOR_ROLE] = RolePermissions({
            canPause: false,
            canUnpause: false,
            canUpgrade: false,
            canMint: true,
            canBurn: false,
            canTransfer: true,
            canApprove: true,
            canSetRole: false,
            canEmergencyAction: false,
            maxAmount: 100000 * 10**18, // 100K tokens
            dailyLimit: 1000000 * 10**18 // 1M tokens
        });
        
        // Auditor role permissions
        rolePermissions[AUDITOR_ROLE] = RolePermissions({
            canPause: false,
            canUnpause: false,
            canUpgrade: false,
            canMint: false,
            canBurn: false,
            canTransfer: false,
            canApprove: false,
            canSetRole: false,
            canEmergencyAction: false,
            maxAmount: 0,
            dailyLimit: 0
        });
        
        // Compliance role permissions
        rolePermissions[COMPLIANCE_ROLE] = RolePermissions({
            canPause: false,
            canUnpause: false,
            canUpgrade: false,
            canMint: false,
            canBurn: false,
            canTransfer: false,
            canApprove: false,
            canSetRole: false,
            canEmergencyAction: false,
            maxAmount: 0,
            dailyLimit: 0
        });
        
        // Payment role permissions
        rolePermissions[PAYMENT_ROLE] = RolePermissions({
            canPause: false,
            canUnpause: false,
            canUpgrade: false,
            canMint: false,
            canBurn: false,
            canTransfer: true,
            canApprove: true,
            canSetRole: false,
            canEmergencyAction: false,
            maxAmount: 1000000 * 10**18, // 1M tokens
            dailyLimit: 10000000 * 10**18 // 10M tokens
        });
        
        // Rewards role permissions
        rolePermissions[REWARDS_ROLE] = RolePermissions({
            canPause: false,
            canUnpause: false,
            canUpgrade: false,
            canMint: true,
            canBurn: false,
            canTransfer: true,
            canApprove: false,
            canSetRole: false,
            canEmergencyAction: false,
            maxAmount: 10000 * 10**18, // 10K tokens
            dailyLimit: 100000 * 10**18 // 100K tokens
        });
        
        // Factory role permissions
        rolePermissions[FACTORY_ROLE] = RolePermissions({
            canPause: false,
            canUnpause: false,
            canUpgrade: false,
            canMint: false,
            canBurn: false,
            canTransfer: false,
            canApprove: false,
            canSetRole: false,
            canEmergencyAction: false,
            maxAmount: 0,
            dailyLimit: 0
        });
        
        // Emergency role permissions
        rolePermissions[EMERGENCY_ROLE] = RolePermissions({
            canPause: true,
            canUnpause: true,
            canUpgrade: false,
            canMint: false,
            canBurn: false,
            canTransfer: false,
            canApprove: false,
            canSetRole: false,
            canEmergencyAction: true,
            maxAmount: 0,
            dailyLimit: 0
        });
    }
    
    /**
     * @dev Find multi-sig config for a proposal
     * @param proposalId Proposal identifier
     * @return configId Configuration identifier
     */
    function _findConfigForProposal(bytes32 proposalId) internal view returns (bytes32 configId) {
        // This is a simplified implementation
        // In production, you'd want to store the configId with the proposal
        for (uint256 i = 0; i < activeMultiSigConfigs.length; i++) {
            if (multiSigConfigs[activeMultiSigConfigs[i]].isActive) {
                return activeMultiSigConfigs[i];
            }
        }
        revert("No active multi-sig config found");
    }
    
    /**
     * @dev Get roles for an account
     * @param account Account address
     * @return roles Array of role identifiers
     */
    function _getRolesForAccount(address account) internal view returns (bytes32[] memory roles) {
        // This is a simplified implementation
        // In production, you'd want to track roles more efficiently
        bytes32[] memory allRoles = new bytes32[](8);
        allRoles[0] = ADMIN_ROLE;
        allRoles[1] = OPERATOR_ROLE;
        allRoles[2] = AUDITOR_ROLE;
        allRoles[3] = COMPLIANCE_ROLE;
        allRoles[4] = PAYMENT_ROLE;
        allRoles[5] = REWARDS_ROLE;
        allRoles[6] = FACTORY_ROLE;
        allRoles[7] = EMERGENCY_ROLE;
        
        uint256 count = 0;
        for (uint256 i = 0; i < allRoles.length; i++) {
            if (hasRole(allRoles[i], account)) {
                count++;
            }
        }
        
        roles = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allRoles.length; i++) {
            if (hasRole(allRoles[i], account)) {
                roles[index] = allRoles[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Check operation permission
     * @param permissions Role permissions
     * @param operation Operation identifier
     * @param amount Operation amount
     * @return hasPermission Whether the operation is permitted
     */
    function _checkOperationPermission(
        RolePermissions memory permissions,
        string memory operation,
        uint256 amount
    ) internal pure returns (bool hasPermission) {
        if (amount > permissions.maxAmount && permissions.maxAmount > 0) {
            return false;
        }
        
        if (keccak256(bytes(operation)) == keccak256("pause")) {
            return permissions.canPause;
        } else if (keccak256(bytes(operation)) == keccak256("unpause")) {
            return permissions.canUnpause;
        } else if (keccak256(bytes(operation)) == keccak256("upgrade")) {
            return permissions.canUpgrade;
        } else if (keccak256(bytes(operation)) == keccak256("mint")) {
            return permissions.canMint;
        } else if (keccak256(bytes(operation)) == keccak256("burn")) {
            return permissions.canBurn;
        } else if (keccak256(bytes(operation)) == keccak256("transfer")) {
            return permissions.canTransfer;
        } else if (keccak256(bytes(operation)) == keccak256("approve")) {
            return permissions.canApprove;
        } else if (keccak256(bytes(operation)) == keccak256("setRole")) {
            return permissions.canSetRole;
        } else if (keccak256(bytes(operation)) == keccak256("emergency")) {
            return permissions.canEmergencyAction;
        }
        
        return false;
    }
}
