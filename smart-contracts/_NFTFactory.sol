// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./NFTCertificate.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title NFTFactory
 * @dev Factory contract for creating and managing NFTCertificate instances
 * @notice This contract enables scalable deployment of NFT certificate contracts
 */
contract NFTFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    struct CertificateInfo {
        address certificateAddress;
        address productRegistry;
        address owner;
        string certificateType;
        string organizationName;
        uint256 createdDate;
        bool isActive;
        uint256 totalMinted;
        string baseURI;
    }

    // Mappings
    mapping(address => CertificateInfo) public certificates;
    mapping(address => address[]) public ownerToCertificates;
    mapping(string => address) public typeToCertificate;
    mapping(address => bool) public authorizedDeployers;
    
    // Arrays for iteration
    address[] public allCertificates;
    address[] public activeCertificates;
    
    // Configuration
    uint256 public deploymentFee = 0.05 ether; // Fee for deploying a certificate contract
    uint256 public constant MAX_CERTIFICATE_TYPE_LENGTH = 50;
    uint256 public constant MAX_ORGANIZATION_NAME_LENGTH = 100;
    uint256 public constant MAX_BASE_URI_LENGTH = 200;
    
    // Events
    event CertificateCreated(
        address indexed certificateAddress,
        address indexed productRegistry,
        address indexed owner,
        string certificateType,
        string organizationName
    );
    event CertificateDeactivated(address indexed certificateAddress, address indexed owner);
    event CertificateReactivated(address indexed certificateAddress, address indexed owner);
    event DeployerAuthorized(address indexed deployer, bool authorized);
    event DeploymentFeeUpdated(uint256 newFee);
    event CertificateMetadataUpdated(address indexed certificateAddress, string newBaseURI);
    
    modifier onlyAuthorizedDeployer() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner(), "Not authorized deployer");
        _;
    }
    
    modifier validCertificateType(string memory certType) {
        require(bytes(certType).length > 0, "Certificate type required");
        require(bytes(certType).length <= MAX_CERTIFICATE_TYPE_LENGTH, "Certificate type too long");
        _;
    }
    
    modifier validOrganizationName(string memory name) {
        require(bytes(name).length > 0, "Organization name required");
        require(bytes(name).length <= MAX_ORGANIZATION_NAME_LENGTH, "Organization name too long");
        _;
    }
    
    modifier validBaseURI(string memory uri) {
        require(bytes(uri).length <= MAX_BASE_URI_LENGTH, "Base URI too long");
        _;
    }
    
    constructor() {
        // Authorize owner as deployer
        authorizedDeployers[owner()] = true;
    }
    
    /**
     * @dev Deploy a new NFTCertificate contract
     * @param productRegistry Address of the associated product registry
     * @param certificateType Type of certificate (authenticity, compliance, quality, etc.)
     * @param organizationName Name of the organization
     * @param baseURI Base URI for token metadata
     * @return certificateAddress Address of the deployed certificate contract
     */
    function deployCertificate(
        address productRegistry,
        string memory certificateType,
        string memory organizationName,
        string memory baseURI
    ) external payable validCertificateType(certificateType) validOrganizationName(organizationName) 
        validBaseURI(baseURI) whenNotPaused nonReentrant returns (address certificateAddress) {
        
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(productRegistry != address(0), "Invalid product registry address");
        require(typeToCertificate[certificateType] == address(0), "Certificate type already exists");
        
        // Deploy new NFTCertificate
        NFTCertificate certificate = new NFTCertificate(productRegistry);
        certificateAddress = address(certificate);
        
        // Transfer ownership to deployer
        certificate.transferOwnership(msg.sender);
        
        // Store certificate information
        certificates[certificateAddress] = CertificateInfo({
            certificateAddress: certificateAddress,
            productRegistry: productRegistry,
            owner: msg.sender,
            certificateType: certificateType,
            organizationName: organizationName,
            createdDate: block.timestamp,
            isActive: true,
            totalMinted: 0,
            baseURI: baseURI
        });
        
        // Update mappings
        typeToCertificate[certificateType] = certificateAddress;
        ownerToCertificates[msg.sender].push(certificateAddress);
        allCertificates.push(certificateAddress);
        activeCertificates.push(certificateAddress);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value.sub(deploymentFee));
        }
        
        emit CertificateCreated(certificateAddress, productRegistry, msg.sender, certificateType, organizationName);
        
        return certificateAddress;
    }
    
    /**
     * @dev Deploy certificate with custom configuration
     * @param productRegistry Address of the associated product registry
     * @param certificateType Type of certificate
     * @param organizationName Name of the organization
     * @param baseURI Base URI for token metadata
     * @param initialSettings Additional initial settings
     * @return certificateAddress Address of the deployed certificate contract
     */
    function deployCertificateWithSettings(
        address productRegistry,
        string memory certificateType,
        string memory organizationName,
        string memory baseURI,
        bytes memory initialSettings
    ) external payable validCertificateType(certificateType) validOrganizationName(organizationName) 
        validBaseURI(baseURI) whenNotPaused nonReentrant returns (address certificateAddress) {
        
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(productRegistry != address(0), "Invalid product registry address");
        require(typeToCertificate[certificateType] == address(0), "Certificate type already exists");
        
        // Deploy new NFTCertificate
        NFTCertificate certificate = new NFTCertificate(productRegistry);
        certificateAddress = address(certificate);
        
        // Transfer ownership to deployer
        certificate.transferOwnership(msg.sender);
        
        // Store certificate information
        certificates[certificateAddress] = CertificateInfo({
            certificateAddress: certificateAddress,
            productRegistry: productRegistry,
            owner: msg.sender,
            certificateType: certificateType,
            organizationName: organizationName,
            createdDate: block.timestamp,
            isActive: true,
            totalMinted: 0,
            baseURI: baseURI
        });
        
        // Update mappings
        typeToCertificate[certificateType] = certificateAddress;
        ownerToCertificates[msg.sender].push(certificateAddress);
        allCertificates.push(certificateAddress);
        activeCertificates.push(certificateAddress);
        
        // Refund excess payment
        if (msg.value > deploymentFee) {
            payable(msg.sender).transfer(msg.value.sub(deploymentFee));
        }
        
        emit CertificateCreated(certificateAddress, productRegistry, msg.sender, certificateType, organizationName);
        
        return certificateAddress;
    }
    
    /**
     * @dev Deactivate a certificate contract
     * @param certificateAddress Address of the certificate contract to deactivate
     */
    function deactivateCertificate(address certificateAddress) external {
        require(certificates[certificateAddress].certificateAddress != address(0), "Certificate not found");
        require(
            certificates[certificateAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        require(certificates[certificateAddress].isActive, "Certificate already inactive");
        
        certificates[certificateAddress].isActive = false;
        
        // Remove from active certificates
        for (uint256 i = 0; i < activeCertificates.length; i++) {
            if (activeCertificates[i] == certificateAddress) {
                activeCertificates[i] = activeCertificates[activeCertificates.length - 1];
                activeCertificates.pop();
                break;
            }
        }
        
        emit CertificateDeactivated(certificateAddress, certificates[certificateAddress].owner);
    }
    
    /**
     * @dev Reactivate a certificate contract
     * @param certificateAddress Address of the certificate contract to reactivate
     */
    function reactivateCertificate(address certificateAddress) external {
        require(certificates[certificateAddress].certificateAddress != address(0), "Certificate not found");
        require(
            certificates[certificateAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        require(!certificates[certificateAddress].isActive, "Certificate already active");
        
        certificates[certificateAddress].isActive = true;
        activeCertificates.push(certificateAddress);
        
        emit CertificateReactivated(certificateAddress, certificates[certificateAddress].owner);
    }
    
    /**
     * @dev Update certificate metadata
     * @param certificateAddress Address of the certificate contract
     * @param newBaseURI New base URI
     */
    function updateCertificateMetadata(
        address certificateAddress,
        string memory newBaseURI
    ) external validBaseURI(newBaseURI) {
        require(certificates[certificateAddress].certificateAddress != address(0), "Certificate not found");
        require(
            certificates[certificateAddress].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        
        certificates[certificateAddress].baseURI = newBaseURI;
        
        emit CertificateMetadataUpdated(certificateAddress, newBaseURI);
    }
    
    /**
     * @dev Get certificate information
     * @param certificateAddress Address of the certificate contract
     * @return info Certificate information
     */
    function getCertificateInfo(address certificateAddress) external view returns (CertificateInfo memory info) {
        require(certificates[certificateAddress].certificateAddress != address(0), "Certificate not found");
        return certificates[certificateAddress];
    }
    
    /**
     * @dev Get certificate by type
     * @param certificateType Type of certificate
     * @return certificateAddress Address of the certificate contract
     */
    function getCertificateByType(string memory certificateType) 
        external 
        view 
        returns (address certificateAddress) 
    {
        return typeToCertificate[certificateType];
    }
    
    /**
     * @dev Get all certificates owned by an address
     * @param owner Address of the owner
     * @return certificateAddresses Array of certificate addresses
     */
    function getCertificatesByOwner(address owner) 
        external 
        view 
        returns (address[] memory certificateAddresses) 
    {
        return ownerToCertificates[owner];
    }
    
    /**
     * @dev Get all active certificates
     * @return certificateAddresses Array of active certificate addresses
     */
    function getActiveCertificates() external view returns (address[] memory certificateAddresses) {
        return activeCertificates;
    }
    
    /**
     * @dev Get all certificates
     * @return certificateAddresses Array of all certificate addresses
     */
    function getAllCertificates() external view returns (address[] memory certificateAddresses) {
        return allCertificates;
    }
    
    /**
     * @dev Get certificate statistics
     * @return totalCertificates Total number of certificates
     * @return activeCertificatesCount Number of active certificates
     * @return totalMinted Total certificates minted across all contracts
     */
    function getCertificateStats() external view returns (
        uint256 totalCertificates,
        uint256 activeCertificatesCount,
        uint256 totalMinted
    ) {
        totalCertificates = allCertificates.length;
        activeCertificatesCount = activeCertificates.length;
        
        for (uint256 i = 0; i < allCertificates.length; i++) {
            totalMinted = totalMinted.add(certificates[allCertificates[i]].totalMinted);
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
     * @dev Update minted count for a certificate (called by certificate contract)
     * @param certificateAddress Address of the certificate contract
     * @param newCount New minted count
     */
    function updateMintedCount(address certificateAddress, uint256 newCount) external {
        require(certificates[certificateAddress].certificateAddress != address(0), "Certificate not found");
        require(msg.sender == certificateAddress, "Only certificate can update count");
        
        certificates[certificateAddress].totalMinted = newCount;
    }
}
