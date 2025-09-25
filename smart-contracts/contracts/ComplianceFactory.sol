// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ComplianceContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ComplianceFactory
 * @dev Factory contract for creating and managing ComplianceContract instances
 * @notice This contract enables scalable deployment of compliance contracts for different industries
 */
contract ComplianceFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    struct ComplianceInfo {
        address complianceAddress;
        address productRegistry;
        address nftContract;
        address traceToken;
        address owner;
        string industryType;
        string organizationName;
        uint256 createdDate;
        bool isActive;
        uint256 ruleCount;
        uint256 checkCount;
        string metadataURI;
    }

    // Mappings
    mapping(address => ComplianceInfo) public complianceContracts;
    mapping(address => address[]) public ownerToCompliance;
    mapping(string => address) public industryToCompliance;
    mapping(address => bool) public authorizedDeployers;
    
    // Arrays for iteration
    address[] public allComplianceContracts;
    address[] public activeComplianceContracts;
    
    // Configuration
    uint256 public deploymentFee = 0.08 ether; // Fee for deploying a compliance contract
    uint256 public constant MAX_INDUSTRY_TYPE_LENGTH = 50;
    uint256 public constant MAX_ORGANIZATION_NAME_LENGTH = 100;
    uint256 public constant MAX_METADATA_URI_LENGTH = 200;
    
    // Events
    event ComplianceContractCreated(
        address indexed complianceAddress,
        address indexed productRegistry,
        address indexed owner,
        string industryType,
        string organizationName
    );
    event ComplianceContractDeactivated(address indexed complianceAddress, address indexed owner);
    event ComplianceContractReactivated(address indexed complianceAddress, address indexed owner);
    event DeployerAuthorized(address indexed deployer, bool authorized);
    event DeploymentFeeUpdated(uint256 newFee);
    event ComplianceMetadataUpdated(address indexed complianceAddress, string newMetadataURI);
    
    modifier onlyAuthorizedDeployer() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner(), "Not authorized deployer");
        _;
    }
    
    modifier validIndustryType(string memory industryType) {
        require(bytes(industryType).length > 0, "Industry type required");
        require(bytes(industryType).length <= MAX_INDUSTRY_TYPE_LENGTH, "Industry type too long");
        _;
    }
    
    modifier validOrganizationName(string memory name) {
        require(bytes(name).length > 0, "Organization name required");
        require(bytes(name).length <= MAX_ORGANIZATION_NAME_LENGTH, "Organization name too long");
        _;
    }
    
    modifier validMetadataURI(string memory uri) {
        require(bytes(uri).length <= MAX_METADATA_URI_LENGTH, "Metadata URI too long");
        _;
    }
    
    constructor() {
        // Authorize owner as deployer
        authorizedDeployers[owner()] = true;
    }
    
    /**
     * @dev Deploy a new ComplianceContract
     * @param productRegistry Address of the associated product registry
     * @param nftContract Address of the associated NFT contract
     * @param traceToken Address of the TRACE token contract
     * @param industryType Type of industry (pharmaceutical, luxury, electronics, etc.)
     * @param organizationName Name of the organization
     * @param metadataURI URI for organization metadata
     * @return complianceAddress Address of the deployed compliance contract
     */
    function deployComplianceContract(
        address productRegistry,
        address nftContract,
        address traceToken,
        string memory industryType,
        string memory organizationName,
        string memory metadataURI
    ) external payable validIndustryType(industryType) validOrganizationName(organizationName) 
        validMetadataURI(metadataURI) whenNotPaused nonReentrant returns (address complianceAddress) {
        
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(productRegistry != address(0), "Invalid product registry address");
        require(nftContract != address(0), "Invalid NFT contract address");
        require(traceToken != address(0), "Invalid token address");
        require(industryToCompliance[industryType] == address(0), "Industry type already exists");
        
        // Deploy new ComplianceContract
        ComplianceContract compliance = new ComplianceContract(productRegistry, nftContract, traceToken);
        complianceAddress = address(compliance);
        
        // Transfer ownership to deployer
        compliance.transferOwnership(msg.sender);
        
        // Store compliance information
        complianceContracts[complianceAddress] = ComplianceInfo({
            complianceAddress: complianceAddress,
            productRegistry: productRegistry,
            nftContract: nftContract,
            traceToken: traceToken,
            owner: msg.sender,
            industryType: industryType,
            organizationName: organizationName,
            createdDate: block.timestamp,
            isActive: true,
            ruleCount: 0,
            checkCount: 0,
            metadataURI: metadataURI
        });
        
        // Update mappings
        industryToCompliance[industryType] = complianceAddress;
        ownerToCompliance[msg.sender].push(complianceAddress);
        allComplianceContracts.push(complianceAddress);
        activeComplianceContracts.push(complianceAddress);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value.sub(deploymentFee));
        }
        
        emit ComplianceContractCreated(complianceAddress, productRegistry, msg.sender, industryType, organizationName);
        
        return complianceAddress;
    }
    
    /**
     * @dev Deploy compliance contract with initial rules
     * @param productRegistry Address of the associated product registry
     * @param nftContract Address of the associated NFT contract
     * @param traceToken Address of the TRACE token contract
     * @param industryType Type of industry
     * @param organizationName Name of the organization
     * @param metadataURI URI for organization metadata
     * @param initialRules Array of initial compliance rules
     * @return complianceAddress Address of the deployed compliance contract
     */
    function deployComplianceContractWithRules(
        address productRegistry,
        address nftContract,
        address traceToken,
        string memory industryType,
        string memory organizationName,
        string memory metadataURI,
        string[] memory initialRules
    ) external payable validIndustryType(industryType) validOrganizationName(organizationName) 
        validMetadataURI(metadataURI) whenNotPaused nonReentrant returns (address complianceAddress) {
        
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(productRegistry != address(0), "Invalid product registry address");
        require(nftContract != address(0), "Invalid NFT contract address");
        require(traceToken != address(0), "Invalid token address");
        require(industryToCompliance[industryType] == address(0), "Industry type already exists");
        require(initialRules.length <= 20, "Too many initial rules");
        
        // Deploy new ComplianceContract
        ComplianceContract compliance = new ComplianceContract(productRegistry, nftContract, traceToken);
        complianceAddress = address(compliance);
        
        // Transfer ownership to deployer
        compliance.transferOwnership(msg.sender);
        
        // Store compliance information
        complianceContracts[complianceAddress] = ComplianceInfo({
            complianceAddress: complianceAddress,
            productRegistry: productRegistry,
            nftContract: nftContract,
            traceToken: traceToken,
            owner: msg.sender,
            industryType: industryType,
            organizationName: organizationName,
            createdDate: block.timestamp,
            isActive: true,
            ruleCount: initialRules.length,
            checkCount: 0,
            metadataURI: metadataURI
        });
        
        // Update mappings
        industryToCompliance[industryType] = complianceAddress;
        ownerToCompliance[msg.sender].push(complianceAddress);
        allComplianceContracts.push(complianceAddress);
        activeComplianceContracts.push(complianceAddress);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value.sub(deploymentFee));
        }
        
        emit ComplianceContractCreated(complianceAddress, productRegistry, msg.sender, industryType, organizationName);
        
        return complianceAddress;
    }
    
    /**
     * @dev Deactivate a compliance contract
     * @param complianceAddress Address of the compliance contract to deactivate
     */
    function deactivateComplianceContract(address complianceAddress) external {
        require(complianceContracts[complianceAddress].complianceAddress != address(0), "Compliance contract not found");
        require(
            complianceContracts[complianceAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        require(complianceContracts[complianceAddress].isActive, "Compliance contract already inactive");
        
        complianceContracts[complianceAddress].isActive = false;
        
        // Remove from active compliance contracts
        for (uint256 i = 0; i < activeComplianceContracts.length; i++) {
            if (activeComplianceContracts[i] == complianceAddress) {
                activeComplianceContracts[i] = activeComplianceContracts[activeComplianceContracts.length - 1];
                activeComplianceContracts.pop();
                break;
            }
        }
        
        emit ComplianceContractDeactivated(complianceAddress, complianceContracts[complianceAddress].owner);
    }
    
    /**
     * @dev Reactivate a compliance contract
     * @param complianceAddress Address of the compliance contract to reactivate
     */
    function reactivateComplianceContract(address complianceAddress) external {
        require(complianceContracts[complianceAddress].complianceAddress != address(0), "Compliance contract not found");
        require(
            complianceContracts[complianceAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        require(!complianceContracts[complianceAddress].isActive, "Compliance contract already active");
        
        complianceContracts[complianceAddress].isActive = true;
        activeComplianceContracts.push(complianceAddress);
        
        emit ComplianceContractReactivated(complianceAddress, complianceContracts[complianceAddress].owner);
    }
    
    /**
     * @dev Update compliance contract metadata
     * @param complianceAddress Address of the compliance contract
     * @param newMetadataURI New metadata URI
     */
    function updateComplianceMetadata(
        address complianceAddress,
        string memory newMetadataURI
    ) external validMetadataURI(newMetadataURI) {
        require(complianceContracts[complianceAddress].complianceAddress != address(0), "Compliance contract not found");
        require(
            complianceContracts[complianceAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        
        complianceContracts[complianceAddress].metadataURI = newMetadataURI;
        
        emit ComplianceMetadataUpdated(complianceAddress, newMetadataURI);
    }
    
    /**
     * @dev Get compliance contract information
     * @param complianceAddress Address of the compliance contract
     * @return info Compliance contract information
     */
    function getComplianceInfo(address complianceAddress) external view returns (ComplianceInfo memory info) {
        require(complianceContracts[complianceAddress].complianceAddress != address(0), "Compliance contract not found");
        return complianceContracts[complianceAddress];
    }
    
    /**
     * @dev Get compliance contract by industry type
     * @param industryType Type of industry
     * @return complianceAddress Address of the compliance contract
     */
    function getComplianceByIndustry(string memory industryType) 
        external 
        view 
        returns (address complianceAddress) 
    {
        return industryToCompliance[industryType];
    }
    
    /**
     * @dev Get all compliance contracts owned by an address
     * @param owner Address of the owner
     * @return complianceAddresses Array of compliance contract addresses
     */
    function getComplianceByOwner(address owner) 
        external 
        view 
        returns (address[] memory complianceAddresses) 
    {
        return ownerToCompliance[owner];
    }
    
    /**
     * @dev Get all active compliance contracts
     * @return complianceAddresses Array of active compliance contract addresses
     */
    function getActiveComplianceContracts() external view returns (address[] memory complianceAddresses) {
        return activeComplianceContracts;
    }
    
    /**
     * @dev Get all compliance contracts
     * @return complianceAddresses Array of all compliance contract addresses
     */
    function getAllComplianceContracts() external view returns (address[] memory complianceAddresses) {
        return allComplianceContracts;
    }
    
    /**
     * @dev Get compliance contract statistics
     * @return totalContracts Total number of compliance contracts
     * @return activeContractsCount Number of active compliance contracts
     * @return totalRules Total rules across all compliance contracts
     * @return totalChecks Total checks across all compliance contracts
     */
    function getComplianceStats() external view returns (
        uint256 totalContracts,
        uint256 activeContractsCount,
        uint256 totalRules,
        uint256 totalChecks
    ) {
        totalContracts = allComplianceContracts.length;
        activeContractsCount = activeComplianceContracts.length;
        
        for (uint256 i = 0; i < allComplianceContracts.length; i++) {
            totalRules = totalRules.add(complianceContracts[allComplianceContracts[i]].ruleCount);
            totalChecks = totalChecks.add(complianceContracts[allComplianceContracts[i]].checkCount);
        }
    }
    
    /**
     * @dev Authorize or deauthorize a deployer
     * @param deployer Address of the deployer
     * @param authorized Whether to authorize or deauthorize
     */
    function setDeployer(address deployer, bool authorized) external onlyOwner {
        require(deployer != address(0), "Invalid deployer address");
        authorizedDeployers[deployer] = authorized;
        emit DeployerAuthorized(deployer, authorized);
    }
    
    /**
     * @dev Set deployment fee
     * @param newFee New deployment fee in wei
     */
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }
    
    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner()).transfer(balance);
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
     * @dev Update rule count for a compliance contract (called by compliance contract)
     * @param complianceAddress Address of the compliance contract
     * @param newCount New rule count
     */
    function updateRuleCount(address complianceAddress, uint256 newCount) external {
        require(complianceContracts[complianceAddress].complianceAddress != address(0), "Compliance contract not found");
        require(msg.sender == complianceAddress, "Only compliance contract can update count");
        
        complianceContracts[complianceAddress].ruleCount = newCount;
    }
    
    /**
     * @dev Update check count for a compliance contract (called by compliance contract)
     * @param complianceAddress Address of the compliance contract
     * @param newCount New check count
     */
    function updateCheckCount(address complianceAddress, uint256 newCount) external {
        require(complianceContracts[complianceAddress].complianceAddress != address(0), "Compliance contract not found");
        require(msg.sender == complianceAddress, "Only compliance contract can update count");
        
        complianceContracts[complianceAddress].checkCount = newCount;
    }
}
