// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProductRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ProductFactory
 * @dev Factory contract for creating and managing ProductRegistry instances
 * @notice This contract enables scalable deployment of product registries for different organizations
 */
contract ProductFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    struct RegistryInfo {
        address registryAddress;
        address owner;
        string organizationName;
        string organizationType;
        uint256 createdDate;
        bool isActive;
        uint256 productCount;
        string metadataURI;
    }

    // Mappings
    mapping(address => RegistryInfo) public registries;
    mapping(address => bool) public authorizedDeployers;
    mapping(string => address) public organizationToRegistry;
    mapping(address => address[]) public ownerToRegistries;
    
    // Arrays for iteration
    address[] public allRegistries;
    address[] public activeRegistries;
    
    // Configuration
    uint256 public deploymentFee = 0.1 ether; // Fee for deploying a registry
    uint256 public constant MAX_ORGANIZATION_NAME_LENGTH = 100;
    uint256 public constant MAX_METADATA_URI_LENGTH = 200;
    
    // Events
    event RegistryCreated(
        address indexed registryAddress,
        address indexed owner,
        string organizationName,
        string organizationType
    );
    event RegistryDeactivated(address indexed registryAddress, address indexed owner);
    event RegistryReactivated(address indexed registryAddress, address indexed owner);
    event DeployerAuthorized(address indexed deployer, bool authorized);
    event DeploymentFeeUpdated(uint256 newFee);
    event RegistryMetadataUpdated(address indexed registryAddress, string newMetadataURI);
    
    modifier onlyAuthorizedDeployer() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner(), "Not authorized deployer");
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
     * @dev Deploy a new ProductRegistry
     * @param organizationName Name of the organization
     * @param organizationType Type of organization (pharmaceutical, luxury, electronics, etc.)
     * @param metadataURI URI for organization metadata
     * @return registryAddress Address of the deployed registry
     */
    function deployRegistry(
        string memory organizationName,
        string memory organizationType,
        string memory metadataURI
    ) external payable validOrganizationName(organizationName) validMetadataURI(metadataURI) 
        whenNotPaused nonReentrant returns (address registryAddress) {
        
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(organizationToRegistry[organizationName] == address(0), "Organization already exists");
        
        // Deploy new ProductRegistry
        ProductRegistry registry = new ProductRegistry();
        registryAddress = address(registry);
        
        // Transfer ownership to deployer
        registry.transferOwnership(msg.sender);
        
        // Store registry information
        registries[registryAddress] = RegistryInfo({
            registryAddress: registryAddress,
            owner: msg.sender,
            organizationName: organizationName,
            organizationType: organizationType,
            createdDate: block.timestamp,
            isActive: true,
            productCount: 0,
            metadataURI: metadataURI
        });
        
        // Update mappings
        organizationToRegistry[organizationName] = registryAddress;
        ownerToRegistries[msg.sender].push(registryAddress);
        allRegistries.push(registryAddress);
        activeRegistries.push(registryAddress);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value.sub(deploymentFee));
        }
        
        emit RegistryCreated(registryAddress, msg.sender, organizationName, organizationType);
        
        return registryAddress;
    }
    
    /**
     * @dev Deploy registry with custom configuration
     * @param organizationName Name of the organization
     * @param organizationType Type of organization
     * @param metadataURI URI for organization metadata
     * @param initialStakeholders Array of initial stakeholders
     * @return registryAddress Address of the deployed registry
     */
    function deployRegistryWithStakeholders(
        string memory organizationName,
        string memory organizationType,
        string memory metadataURI,
        address[] memory initialStakeholders
    ) external payable validOrganizationName(organizationName) validMetadataURI(metadataURI) 
        whenNotPaused nonReentrant returns (address registryAddress) {
        
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(organizationToRegistry[organizationName] == address(0), "Organization already exists");
        require(initialStakeholders.length <= 10, "Too many initial stakeholders");
        
        // Deploy new ProductRegistry
        ProductRegistry registry = new ProductRegistry();
        registryAddress = address(registry);
        
        // Transfer ownership to deployer
        registry.transferOwnership(msg.sender);
        
        // Store registry information
        registries[registryAddress] = RegistryInfo({
            registryAddress: registryAddress,
            owner: msg.sender,
            organizationName: organizationName,
            organizationType: organizationType,
            createdDate: block.timestamp,
            isActive: true,
            productCount: 0,
            metadataURI: metadataURI
        });
        
        // Update mappings
        organizationToRegistry[organizationName] = registryAddress;
        ownerToRegistries[msg.sender].push(registryAddress);
        allRegistries.push(registryAddress);
        activeRegistries.push(registryAddress);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value.sub(deploymentFee));
        }
        
        emit RegistryCreated(registryAddress, msg.sender, organizationName, organizationType);
        
        return registryAddress;
    }
    
    /**
     * @dev Deactivate a registry
     * @param registryAddress Address of the registry to deactivate
     */
    function deactivateRegistry(address registryAddress) external {
        require(registries[registryAddress].registryAddress != address(0), "Registry not found");
        require(
            registries[registryAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        require(registries[registryAddress].isActive, "Registry already inactive");
        
        registries[registryAddress].isActive = false;
        
        // Remove from active registries
        for (uint256 i = 0; i < activeRegistries.length; i++) {
            if (activeRegistries[i] == registryAddress) {
                activeRegistries[i] = activeRegistries[activeRegistries.length - 1];
                activeRegistries.pop();
                break;
            }
        }
        
        emit RegistryDeactivated(registryAddress, registries[registryAddress].owner);
    }
    
    /**
     * @dev Reactivate a registry
     * @param registryAddress Address of the registry to reactivate
     */
    function reactivateRegistry(address registryAddress) external {
        require(registries[registryAddress].registryAddress != address(0), "Registry not found");
        require(
            registries[registryAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        require(!registries[registryAddress].isActive, "Registry already active");
        
        registries[registryAddress].isActive = true;
        activeRegistries.push(registryAddress);
        
        emit RegistryReactivated(registryAddress, registries[registryAddress].owner);
    }
    
    /**
     * @dev Update registry metadata
     * @param registryAddress Address of the registry
     * @param newMetadataURI New metadata URI
     */
    function updateRegistryMetadata(
        address registryAddress,
        string memory newMetadataURI
    ) external validMetadataURI(newMetadataURI) {
        require(registries[registryAddress].registryAddress != address(0), "Registry not found");
        require(
            registries[registryAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        
        registries[registryAddress].metadataURI = newMetadataURI;
        
        emit RegistryMetadataUpdated(registryAddress, newMetadataURI);
    }
    
    /**
     * @dev Get registry information
     * @param registryAddress Address of the registry
     * @return info Registry information
     */
    function getRegistryInfo(address registryAddress) external view returns (RegistryInfo memory info) {
        require(registries[registryAddress].registryAddress != address(0), "Registry not found");
        return registries[registryAddress];
    }
    
    /**
     * @dev Get registry by organization name
     * @param organizationName Name of the organization
     * @return registryAddress Address of the registry
     */
    function getRegistryByOrganization(string memory organizationName) 
        external 
        view 
        returns (address registryAddress) 
    {
        return organizationToRegistry[organizationName];
    }
    
    /**
     * @dev Get all registries owned by an address
     * @param owner Address of the owner
     * @return registryAddresses Array of registry addresses
     */
    function getRegistriesByOwner(address owner) 
        external 
        view 
        returns (address[] memory registryAddresses) 
    {
        return ownerToRegistries[owner];
    }
    
    /**
     * @dev Get all active registries
     * @return registryAddresses Array of active registry addresses
     */
    function getActiveRegistries() external view returns (address[] memory registryAddresses) {
        return activeRegistries;
    }
    
    /**
     * @dev Get all registries
     * @return registryAddresses Array of all registry addresses
     */
    function getAllRegistries() external view returns (address[] memory registryAddresses) {
        return allRegistries;
    }
    
    /**
     * @dev Get registry statistics
     * @return totalRegistries Total number of registries
     * @return activeRegistriesCount Number of active registries
     * @return totalProducts Total products across all registries
     */
    function getRegistryStats() external view returns (
        uint256 totalRegistries,
        uint256 activeRegistriesCount,
        uint256 totalProducts
    ) {
        totalRegistries = allRegistries.length;
        activeRegistriesCount = activeRegistries.length;
        
        for (uint256 i = 0; i < allRegistries.length; i++) {
            totalProducts = totalProducts.add(registries[allRegistries[i]].productCount);
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
     * @dev Update product count for a registry (called by registry)
     * @param registryAddress Address of the registry
     * @param newCount New product count
     */
    function updateProductCount(address registryAddress, uint256 newCount) external {
        require(registries[registryAddress].registryAddress != address(0), "Registry not found");
        require(msg.sender == registryAddress, "Only registry can update count");
        
        registries[registryAddress].productCount = newCount;
    }
}
