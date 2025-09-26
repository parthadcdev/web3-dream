// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTCertificate.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTFactory
 * @dev Factory contract for deploying NFT certificate instances
 */
contract NFTFactory is Ownable, ReentrancyGuard {
    
    struct NFTInstance {
        address contractAddress;
        string name;
        string symbol;
        address owner;
        uint256 createdAt;
        bool isActive;
    }
    
    mapping(uint256 => NFTInstance) public nftInstances;
    mapping(address => bool) public isNFTCertificate;
    mapping(address => uint256) public nftToInstanceId;
    
    uint256 public instanceCount;
    uint256 public deploymentFee = 0.1 ether;
    
    event NFTCertificateDeployed(
        uint256 indexed instanceId,
        address indexed contractAddress,
        string name,
        string symbol,
        address indexed owner
    );
    
    event DeploymentFeeUpdated(uint256 newFee);
    
    modifier validInstanceId(uint256 instanceId) {
        require(instanceId > 0 && instanceId <= instanceCount, "Invalid instance ID");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Deploy a new NFT certificate contract
     * @param name Name of the NFT collection
     * @param symbol Symbol of the NFT collection
     * @param baseTokenURI Base URI for metadata
     * @return Instance ID and contract address
     */
    function deployNFTCertificate(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) external payable nonReentrant returns (uint256, address) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(bytes(baseTokenURI).length > 0, "Base URI required");
        
        instanceCount++;
        
        NFTCertificate newNFT = new NFTCertificate(
            name,
            symbol,
            baseTokenURI
        );
        
        address nftAddress = address(newNFT);
        
        NFTInstance storage instance = nftInstances[instanceCount];
        instance.contractAddress = nftAddress;
        instance.name = name;
        instance.symbol = symbol;
        instance.owner = msg.sender;
        instance.createdAt = block.timestamp;
        instance.isActive = true;
        
        isNFTCertificate[nftAddress] = true;
        nftToInstanceId[nftAddress] = instanceCount;
        
        // Transfer ownership to the deployer
        newNFT.transferOwnership(msg.sender);
        
        emit NFTCertificateDeployed(instanceCount, nftAddress, name, symbol, msg.sender);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value - deploymentFee);
        }
        
        return (instanceCount, nftAddress);
    }
    
    /**
     * @dev Get NFT instance details
     * @param instanceId Instance ID
     * @return contractAddress The address of the NFT contract
     * @return name The name of the NFT contract
     * @return symbol The symbol of the NFT contract
     * @return owner The owner of the NFT contract
     * @return createdAt The creation timestamp
     * @return isActive Whether the instance is active
     */
    function getNFTInstance(uint256 instanceId) 
        external 
        view 
        validInstanceId(instanceId) 
        returns (
            address contractAddress,
            string memory name,
            string memory symbol,
            address owner,
            uint256 createdAt,
            bool isActive
        ) 
    {
        NFTInstance storage instance = nftInstances[instanceId];
        return (
            instance.contractAddress,
            instance.name,
            instance.symbol,
            instance.owner,
            instance.createdAt,
            instance.isActive
        );
    }
    
    /**
     * @dev Get all NFT instances by owner
     * @param owner Owner address
     * @return Array of instance IDs
     */
    function getInstancesByOwner(address owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory instances = new uint256[](instanceCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= instanceCount; i++) {
            if (nftInstances[i].owner == owner) {
                instances[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = instances[i];
        }
        
        return result;
    }
    
    /**
     * @dev Deactivate an NFT instance
     * @param instanceId Instance ID to deactivate
     */
    function deactivateInstance(uint256 instanceId) 
        external 
        validInstanceId(instanceId) 
    {
        NFTInstance storage instance = nftInstances[instanceId];
        require(instance.owner == msg.sender || msg.sender == owner(), "Not authorized");
        
        instance.isActive = false;
    }
    
    /**
     * @dev Update deployment fee
     * @param newFee New deployment fee
     */
    function updateDeploymentFee(uint256 newFee) external onlyOwner {
        require(newFee >= 0, "Invalid fee");
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }
    
    /**
     * @dev Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
    }
}
