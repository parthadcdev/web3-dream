# Smart Contract Architecture Design

## 1. Smart Contract System Overview

### Contract Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│                   Factory Contracts                    │
├─────────────────────────────────────────────────────────┤
│  ProductFactory        │  NFTFactory                   │
│  ComplianceFactory     │  PaymentFactory               │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Core Contracts                       │
├─────────────────────────────────────────────────────────┤
│  ProductRegistry        │  TraceabilityContract        │
│  ComplianceContract     │  PaymentContract             │
│  NFTCertificate         │  AuditContract               │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Utility Contracts                    │
├─────────────────────────────────────────────────────────┤
│  AccessControl          │  Pausable                    │
│  ReentrancyGuard        │  EmergencyStop               │
└─────────────────────────────────────────────────────────┘
```

## 2. Core Smart Contracts

### ProductRegistry.sol
**Purpose**: Central registry for all products in the system

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract ProductRegistry is Ownable, ReentrancyGuard, Pausable {
    struct Product {
        uint256 productId;
        string productName;
        string productType; // "pharmaceutical", "luxury", "electronics"
        string manufacturer;
        string batchNumber;
        uint256 manufactureDate;
        uint256 expiryDate;
        string[] rawMaterials;
        address[] stakeholders; // manufacturers, distributors, retailers
        bool isActive;
        string metadataURI; // IPFS link to detailed product info
    }

    struct Checkpoint {
        uint256 timestamp;
        string location;
        address stakeholder;
        string status; // "manufactured", "shipped", "received", "sold"
        string temperature;
        string humidity;
        string additionalData;
    }

    mapping(uint256 => Product) public products;
    mapping(uint256 => Checkpoint[]) public productCheckpoints;
    mapping(address => uint256[]) public stakeholderProducts;
    mapping(string => uint256) public batchToProductId;

    uint256 public nextProductId = 1;
    uint256 public totalProducts;

    event ProductRegistered(
        uint256 indexed productId,
        string productName,
        address indexed manufacturer,
        string batchNumber
    );

    event CheckpointAdded(
        uint256 indexed productId,
        uint256 checkpointIndex,
        address indexed stakeholder,
        string status
    );

    function registerProduct(
        string memory _productName,
        string memory _productType,
        string memory _batchNumber,
        uint256 _manufactureDate,
        uint256 _expiryDate,
        string[] memory _rawMaterials,
        string memory _metadataURI
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(bytes(_productName).length > 0, "Product name required");
        require(_manufactureDate > 0, "Invalid manufacture date");
        require(_expiryDate > _manufactureDate, "Expiry must be after manufacture");

        uint256 productId = nextProductId++;
        
        products[productId] = Product({
            productId: productId,
            productName: _productName,
            productType: _productType,
            manufacturer: msg.sender,
            batchNumber: _batchNumber,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            rawMaterials: _rawMaterials,
            stakeholders: [msg.sender],
            isActive: true,
            metadataURI: _metadataURI
        });

        batchToProductId[_batchNumber] = productId;
        stakeholderProducts[msg.sender].push(productId);
        totalProducts++;

        // Add initial checkpoint
        addCheckpoint(productId, "manufactured", "Manufacturing facility", "");

        emit ProductRegistered(productId, _productName, msg.sender, _batchNumber);
        
        return productId;
    }

    function addCheckpoint(
        uint256 _productId,
        string memory _status,
        string memory _location,
        string memory _additionalData
    ) public whenNotPaused nonReentrant {
        require(products[_productId].isActive, "Product not active");
        require(bytes(_status).length > 0, "Status required");

        // Verify stakeholder authorization
        bool isAuthorized = false;
        for (uint256 i = 0; i < products[_productId].stakeholders.length; i++) {
            if (products[_productId].stakeholders[i] == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "Not authorized stakeholder");

        Checkpoint memory newCheckpoint = Checkpoint({
            timestamp: block.timestamp,
            location: _location,
            stakeholder: msg.sender,
            status: _status,
            temperature: "",
            humidity: "",
            additionalData: _additionalData
        });

        productCheckpoints[_productId].push(newCheckpoint);

        emit CheckpointAdded(
            _productId,
            productCheckpoints[_productId].length - 1,
            msg.sender,
            _status
        );
    }

    function addStakeholder(uint256 _productId, address _stakeholder) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(products[_productId].isActive, "Product not active");
        require(_stakeholder != address(0), "Invalid stakeholder address");
        
        // Only current stakeholders or owner can add new stakeholders
        bool isCurrentStakeholder = false;
        for (uint256 i = 0; i < products[_productId].stakeholders.length; i++) {
            if (products[_productId].stakeholders[i] == msg.sender) {
                isCurrentStakeholder = true;
                break;
            }
        }
        require(isCurrentStakeholder || msg.sender == owner(), "Not authorized");

        products[_productId].stakeholders.push(_stakeholder);
        stakeholderProducts[_stakeholder].push(_productId);
    }

    function getProduct(uint256 _productId) external view returns (Product memory) {
        require(_productId > 0 && _productId < nextProductId, "Product not found");
        return products[_productId];
    }

    function getCheckpoints(uint256 _productId) external view returns (Checkpoint[] memory) {
        require(_productId > 0 && _productId < nextProductId, "Product not found");
        return productCheckpoints[_productId];
    }

    function getStakeholderProducts(address _stakeholder) external view returns (uint256[] memory) {
        return stakeholderProducts[_stakeholder];
    }

    function deactivateProduct(uint256 _productId) external {
        require(_productId > 0 && _productId < nextProductId, "Product not found");
        require(products[_productId].manufacturer == msg.sender || msg.sender == owner(), "Not authorized");
        
        products[_productId].isActive = false;
    }

    function emergencyPause() external onlyOwner {
        _pause();
    }

    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
}
```

### NFTCertificate.sol
**Purpose**: NFT-based product certificates for authenticity

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTCertificate is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    struct Certificate {
        uint256 productId;
        string certificateType; // "authenticity", "compliance", "quality"
        uint256 issueDate;
        uint256 expiryDate;
        string issuer;
        string standards; // ISO, FDA, etc.
        bool isValid;
        string verificationCode; // Unique QR code data
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(uint256 => uint256) public productToCertificate; // productId => tokenId
    mapping(string => bool) public usedVerificationCodes;

    uint256 public nextTokenId = 1;
    address public productRegistry;

    event CertificateMinted(
        uint256 indexed tokenId,
        uint256 indexed productId,
        string certificateType,
        address indexed owner
    );

    event CertificateVerified(
        uint256 indexed tokenId,
        bool isValid,
        string reason
    );

    modifier onlyProductRegistry() {
        require(msg.sender == productRegistry, "Only product registry");
        _;
    }

    constructor(address _productRegistry) ERC721("ProductCertificate", "PCERT") {
        productRegistry = _productRegistry;
    }

    function mintCertificate(
        address _to,
        uint256 _productId,
        string memory _certificateType,
        uint256 _expiryDate,
        string memory _issuer,
        string memory _standards,
        string memory _tokenURI,
        string memory _verificationCode
    ) external onlyProductRegistry nonReentrant returns (uint256) {
        require(_to != address(0), "Invalid recipient");
        require(!usedVerificationCodes[_verificationCode], "Verification code already used");
        require(bytes(_verificationCode).length > 0, "Verification code required");

        uint256 tokenId = nextTokenId++;
        
        certificates[tokenId] = Certificate({
            productId: _productId,
            certificateType: _certificateType,
            issueDate: block.timestamp,
            expiryDate: _expiryDate,
            issuer: _issuer,
            standards: _standards,
            isValid: true,
            verificationCode: _verificationCode
        });

        productToCertificate[_productId] = tokenId;
        usedVerificationCodes[_verificationCode] = true;

        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit CertificateMinted(tokenId, _productId, _certificateType, _to);
        
        return tokenId;
    }

    function verifyCertificate(uint256 _tokenId) external view returns (bool, string memory) {
        require(_exists(_tokenId), "Certificate does not exist");
        
        Certificate memory cert = certificates[_tokenId];
        
        if (!cert.isValid) {
            return (false, "Certificate has been invalidated");
        }
        
        if (block.timestamp > cert.expiryDate) {
            return (false, "Certificate has expired");
        }
        
        return (true, "Certificate is valid");
    }

    function verifyByCode(string memory _verificationCode) external view returns (uint256, bool, string memory) {
        require(bytes(_verificationCode).length > 0, "Verification code required");
        
        // Find certificate by verification code
        for (uint256 i = 1; i < nextTokenId; i++) {
            if (keccak256(bytes(certificates[i].verificationCode)) == keccak256(bytes(_verificationCode))) {
                (bool isValid, string memory reason) = verifyCertificate(i);
                return (i, isValid, reason);
            }
        }
        
        return (0, false, "Certificate not found");
    }

    function invalidateCertificate(uint256 _tokenId) external {
        require(_exists(_tokenId), "Certificate does not exist");
        require(ownerOf(_tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        
        certificates[_tokenId].isValid = false;
        
        emit CertificateVerified(_tokenId, false, "Certificate invalidated by owner");
    }

    function getCertificate(uint256 _tokenId) external view returns (Certificate memory) {
        require(_exists(_tokenId), "Certificate does not exist");
        return certificates[_tokenId];
    }

    function getCertificateByProduct(uint256 _productId) external view returns (uint256) {
        return productToCertificate[_productId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}
```

### ComplianceContract.sol
**Purpose**: Automated compliance checking and certification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ComplianceContract is Ownable, ReentrancyGuard {
    struct ComplianceRule {
        string ruleId;
        string ruleName;
        string productType;
        string requirement;
        bool isActive;
        uint256 createdDate;
    }

    struct ComplianceCheck {
        uint256 productId;
        string ruleId;
        bool passed;
        string evidence;
        uint256 checkDate;
        address auditor;
    }

    mapping(string => ComplianceRule) public complianceRules;
    mapping(uint256 => ComplianceCheck[]) public productComplianceChecks;
    mapping(uint256 => bool) public productComplianceStatus;
    
    string[] public activeRuleIds;
    address public productRegistry;
    address public nftContract;

    event RuleAdded(string indexed ruleId, string ruleName, string productType);
    event ComplianceChecked(uint256 indexed productId, string indexed ruleId, bool passed);
    event ProductCompliant(uint256 indexed productId, bool isCompliant);

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || 
            msg.sender == productRegistry || 
            msg.sender == nftContract,
            "Not authorized"
        );
        _;
    }

    constructor(address _productRegistry, address _nftContract) {
        productRegistry = _productRegistry;
        nftContract = _nftContract;
        
        // Initialize with common compliance rules
        _addDefaultRules();
    }

    function addComplianceRule(
        string memory _ruleId,
        string memory _ruleName,
        string memory _productType,
        string memory _requirement
    ) external onlyOwner {
        require(bytes(_ruleId).length > 0, "Rule ID required");
        require(!_ruleExists(_ruleId), "Rule already exists");
        
        complianceRules[_ruleId] = ComplianceRule({
            ruleId: _ruleId,
            ruleName: _ruleName,
            productType: _productType,
            requirement: _requirement,
            isActive: true,
            createdDate: block.timestamp
        });
        
        activeRuleIds.push(_ruleId);
        
        emit RuleAdded(_ruleId, _ruleName, _productType);
    }

    function checkCompliance(
        uint256 _productId,
        string memory _ruleId,
        bool _passed,
        string memory _evidence
    ) external onlyAuthorized nonReentrant {
        require(_productId > 0, "Invalid product ID");
        require(_ruleExists(_ruleId), "Rule does not exist");
        require(complianceRules[_ruleId].isActive, "Rule is inactive");
        
        ComplianceCheck memory check = ComplianceCheck({
            productId: _productId,
            ruleId: _ruleId,
            passed: _passed,
            evidence: _evidence,
            checkDate: block.timestamp,
            auditor: msg.sender
        });
        
        productComplianceChecks[_productId].push(check);
        
        emit ComplianceChecked(_productId, _ruleId, _passed);
        
        // Update overall compliance status
        _updateProductComplianceStatus(_productId);
    }

    function batchComplianceCheck(
        uint256 _productId,
        string[] memory _ruleIds,
        bool[] memory _results,
        string[] memory _evidence
    ) external onlyAuthorized {
        require(_ruleIds.length == _results.length, "Arrays length mismatch");
        require(_results.length == _evidence.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _ruleIds.length; i++) {
            checkCompliance(_productId, _ruleIds[i], _results[i], _evidence[i]);
        }
    }

    function getProductCompliance(uint256 _productId) 
        external 
        view 
        returns (bool isCompliant, ComplianceCheck[] memory checks) 
    {
        checks = productComplianceChecks[_productId];
        isCompliant = productComplianceStatus[_productId];
    }

    function getRulesForProductType(string memory _productType) 
        external 
        view 
        returns (string[] memory ruleIds) 
    {
        uint256 count = 0;
        
        // Count matching rules
        for (uint256 i = 0; i < activeRuleIds.length; i++) {
            if (
                keccak256(bytes(complianceRules[activeRuleIds[i]].productType)) == 
                keccak256(bytes(_productType)) &&
                complianceRules[activeRuleIds[i]].isActive
            ) {
                count++;
            }
        }
        
        // Create result array
        ruleIds = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeRuleIds.length; i++) {
            if (
                keccak256(bytes(complianceRules[activeRuleIds[i]].productType)) == 
                keccak256(bytes(_productType)) &&
                complianceRules[activeRuleIds[i]].isActive
            ) {
                ruleIds[index] = activeRuleIds[i];
                index++;
            }
        }
    }

    function _ruleExists(string memory _ruleId) internal view returns (bool) {
        return bytes(complianceRules[_ruleId].ruleId).length > 0;
    }

    function _updateProductComplianceStatus(uint256 _productId) internal {
        ComplianceCheck[] memory checks = productComplianceChecks[_productId];
        
        bool allPassed = true;
        for (uint256 i = 0; i < checks.length; i++) {
            if (!checks[i].passed) {
                allPassed = false;
                break;
            }
        }
        
        productComplianceStatus[_productId] = allPassed;
        
        emit ProductCompliant(_productId, allPassed);
    }

    function _addDefaultRules() internal {
        // Pharmaceutical compliance rules
        addComplianceRule(
            "FDA_001",
            "FDA Manufacturing Standards",
            "pharmaceutical",
            "Manufacturing facility must be FDA approved"
        );
        
        addComplianceRule(
            "HIPAA_001",
            "HIPAA Data Protection",
            "pharmaceutical",
            "Patient data must be HIPAA compliant"
        );
        
        addComplianceRule(
            "GMP_001",
            "Good Manufacturing Practices",
            "pharmaceutical",
            "Must follow GMP guidelines"
        );
        
        // Luxury goods compliance rules
        addComplianceRule(
            "AUTH_001",
            "Authenticity Verification",
            "luxury",
            "Product must pass authenticity verification"
        );
        
        addComplianceRule(
            "ETHICS_001",
            "Ethical Sourcing",
            "luxury",
            "Materials must be ethically sourced"
        );
    }

    function toggleRule(string memory _ruleId) external onlyOwner {
        require(_ruleExists(_ruleId), "Rule does not exist");
        complianceRules[_ruleId].isActive = !complianceRules[_ruleId].isActive;
    }
}
```

### PaymentContract.sol
**Purpose**: Automated payments and escrow for supply chain transactions

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentContract is ReentrancyGuard, Pausable, Ownable {
    struct Payment {
        uint256 paymentId;
        address payer;
        address payee;
        uint256 amount;
        uint256 productId;
        string paymentType; // "escrow", "milestone", "final"
        bool isCompleted;
        bool isDisputed;
        uint256 createdDate;
        uint256 dueDate;
        string conditions;
    }

    struct Dispute {
        uint256 disputeId;
        uint256 paymentId;
        address initiator;
        string reason;
        bool isResolved;
        address arbitrator;
        uint256 resolutionDate;
    }

    mapping(uint256 => Payment) public payments;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256[]) public userPayments;
    
    uint256 public nextPaymentId = 1;
    uint256 public nextDisputeId = 1;
    uint256 public platformFeePercentage = 250; // 2.5%
    address public feeRecipient;
    IERC20 public paymentToken; // USDC or similar stablecoin

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed payer,
        address indexed payee,
        uint256 amount
    );

    event PaymentCompleted(uint256 indexed paymentId);
    event DisputeInitiated(uint256 indexed disputeId, uint256 indexed paymentId);
    event DisputeResolved(uint256 indexed disputeId, bool favorPayer);

    constructor(address _paymentToken, address _feeRecipient) {
        paymentToken = IERC20(_paymentToken);
        feeRecipient = _feeRecipient;
    }

    function createEscrowPayment(
        address _payee,
        uint256 _amount,
        uint256 _productId,
        uint256 _dueDate,
        string memory _conditions
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(_payee != address(0), "Invalid payee address");
        require(_amount > 0, "Amount must be positive");
        require(_dueDate > block.timestamp, "Due date must be in future");

        uint256 paymentId = nextPaymentId++;
        uint256 platformFee = (_amount * platformFeePercentage) / 10000;
        uint256 totalAmount = _amount + platformFee;

        // Transfer tokens to contract (including platform fee)
        require(
            paymentToken.transferFrom(msg.sender, address(this), totalAmount),
            "Transfer failed"
        );

        payments[paymentId] = Payment({
            paymentId: paymentId,
            payer: msg.sender,
            payee: _payee,
            amount: _amount,
            productId: _productId,
            paymentType: "escrow",
            isCompleted: false,
            isDisputed: false,
            createdDate: block.timestamp,
            dueDate: _dueDate,
            conditions: _conditions
        });

        userPayments[msg.sender].push(paymentId);
        userPayments[_payee].push(paymentId);

        emit PaymentCreated(paymentId, msg.sender, _payee, _amount);
        
        return paymentId;
    }

    function releasePayment(uint256 _paymentId) external whenNotPaused nonReentrant {
        Payment storage payment = payments[_paymentId];
        require(payment.paymentId > 0, "Payment not found");
        require(!payment.isCompleted, "Payment already completed");
        require(!payment.isDisputed, "Payment is disputed");
        require(payment.payer == msg.sender, "Only payer can release");
        
        // Check if conditions are met (simplified - in practice, this would be more complex)
        require(block.timestamp >= payment.createdDate + 1 days, "Minimum hold period");

        payment.isCompleted = true;

        // Transfer payment to payee
        require(
            paymentToken.transfer(payment.payee, payment.amount),
            "Transfer to payee failed"
        );

        // Transfer platform fee to fee recipient
        uint256 platformFee = (payment.amount * platformFeePercentage) / 10000;
        require(
            paymentToken.transfer(feeRecipient, platformFee),
            "Transfer fee failed"
        );

        emit PaymentCompleted(_paymentId);
    }

    function initiateDispute(
        uint256 _paymentId,
        string memory _reason
    ) external whenNotPaused nonReentrant returns (uint256) {
        Payment storage payment = payments[_paymentId];
        require(payment.paymentId > 0, "Payment not found");
        require(!payment.isCompleted, "Payment already completed");
        require(!payment.isDisputed, "Dispute already initiated");
        require(
            msg.sender == payment.payer || msg.sender == payment.payee,
            "Only parties can dispute"
        );

        uint256 disputeId = nextDisputeId++;
        
        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            paymentId: _paymentId,
            initiator: msg.sender,
            reason: _reason,
            isResolved: false,
            arbitrator: address(0),
            resolutionDate: 0
        });

        payment.isDisputed = true;

        emit DisputeInitiated(disputeId, _paymentId);
        
        return disputeId;
    }

    function resolveDispute(
        uint256 _disputeId,
        bool _favorPayer
    ) external onlyOwner whenNotPaused nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.disputeId > 0, "Dispute not found");
        require(!dispute.isResolved, "Dispute already resolved");

        Payment storage payment = payments[dispute.paymentId];
        require(payment.isDisputed, "Payment not disputed");

        dispute.isResolved = true;
        dispute.arbitrator = msg.sender;
        dispute.resolutionDate = block.timestamp;

        if (_favorPayer) {
            // Refund to payer
            uint256 platformFee = (payment.amount * platformFeePercentage) / 10000;
            require(
                paymentToken.transfer(payment.payer, payment.amount + platformFee),
                "Refund failed"
            );
        } else {
            // Release to payee
            require(
                paymentToken.transfer(payment.payee, payment.amount),
                "Payment failed"
            );
            
            uint256 platformFee = (payment.amount * platformFeePercentage) / 10000;
            require(
                paymentToken.transfer(feeRecipient, platformFee),
                "Fee transfer failed"
            );
        }

        payment.isCompleted = true;

        emit DisputeResolved(_disputeId, _favorPayer);
    }

    function getUserPayments(address _user) external view returns (uint256[] memory) {
        return userPayments[_user];
    }

    function getPayment(uint256 _paymentId) external view returns (Payment memory) {
        require(_paymentId > 0 && _paymentId < nextPaymentId, "Payment not found");
        return payments[_paymentId];
    }

    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        require(_disputeId > 0 && _disputeId < nextDisputeId, "Dispute not found");
        return disputes[_disputeId];
    }

    function setPlatformFee(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeePercentage = _feePercentage;
    }

    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }

    function emergencyPause() external onlyOwner {
        _pause();
    }

    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}
```

## 3. Smart Contract Integration

### Contract Deployment Script
```javascript
// deploy.js
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy ProductRegistry
    const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
    const productRegistry = await ProductRegistry.deploy();
    await productRegistry.deployed();
    console.log("ProductRegistry deployed to:", productRegistry.address);

    // Deploy NFTCertificate
    const NFTCertificate = await ethers.getContractFactory("NFTCertificate");
    const nftCertificate = await NFTCertificate.deploy(productRegistry.address);
    await nftCertificate.deployed();
    console.log("NFTCertificate deployed to:", nftCertificate.address);

    // Deploy ComplianceContract
    const ComplianceContract = await ethers.getContractFactory("ComplianceContract");
    const complianceContract = await ComplianceContract.deploy(
        productRegistry.address,
        nftCertificate.address
    );
    await complianceContract.deployed();
    console.log("ComplianceContract deployed to:", complianceContract.address);

    // Deploy PaymentContract (assuming USDC address)
    const usdcAddress = "0xA0b86a33E6441d9b4c8A7e7b0b9c8d0e1f2a3b4c"; // Replace with actual USDC address
    const PaymentContract = await ethers.getContractFactory("PaymentContract");
    const paymentContract = await PaymentContract.deploy(usdcAddress, deployer.address);
    await paymentContract.deployed();
    console.log("PaymentContract deployed to:", paymentContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

### Hardhat Configuration
```javascript
// hardhat.config.js
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");

module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        polygon: {
            url: "https://polygon-rpc.com",
            accounts: [process.env.PRIVATE_KEY],
            gasPrice: 20000000000, // 20 gwei
        },
        mumbai: {
            url: "https://rpc-mumbai.maticvigil.com",
            accounts: [process.env.PRIVATE_KEY],
            gasPrice: 20000000000,
        }
    },
    etherscan: {
        apiKey: process.env.POLYGONSCAN_API_KEY
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD"
    }
};
```

## 4. Security Best Practices

### Access Control
- **Role-based permissions**: Different access levels for different stakeholders
- **Multi-signature requirements**: Critical operations require multiple approvals
- **Time-locked functions**: Important changes have delay periods
- **Emergency pause**: Ability to halt system in case of critical issues

### Reentrancy Protection
- **Checks-Effects-Interactions pattern**: State changes before external calls
- **ReentrancyGuard modifier**: Protection against reentrancy attacks
- **Pull over push pattern**: Let users withdraw funds instead of pushing

### Gas Optimization
- **Batch operations**: Group multiple operations to reduce gas costs
- **Storage optimization**: Pack structs efficiently
- **Event optimization**: Use indexed parameters for filtering
- **Function optimization**: Use view/pure functions where possible

### Testing Framework
```javascript
// test/ProductRegistry.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProductRegistry", function () {
    let productRegistry;
    let owner, manufacturer, distributor, retailer;

    beforeEach(async function () {
        [owner, manufacturer, distributor, retailer] = await ethers.getSigners();
        
        const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();
    });

    it("Should register a product", async function () {
        const rawMaterials = ["Material1", "Material2"];
        const metadataURI = "https://ipfs.io/ipfs/QmHash";
        
        const tx = await productRegistry.connect(manufacturer).registerProduct(
            "Test Product",
            "pharmaceutical",
            "BATCH001",
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
            rawMaterials,
            metadataURI
        );

        await expect(tx)
            .to.emit(productRegistry, "ProductRegistered")
            .withArgs(1, "Test Product", manufacturer.address, "BATCH001");
    });

    it("Should add checkpoint", async function () {
        // First register a product
        await productRegistry.connect(manufacturer).registerProduct(
            "Test Product",
            "pharmaceutical",
            "BATCH001",
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 86400 * 365,
            ["Material1"],
            "https://ipfs.io/ipfs/QmHash"
        );

        // Add stakeholder
        await productRegistry.connect(manufacturer).addStakeholder(1, distributor.address);

        // Add checkpoint
        const tx = await productRegistry.connect(distributor).addCheckpoint(
            1,
            "shipped",
            "Warehouse A",
            "Temperature: 2-8°C"
        );

        await expect(tx)
            .to.emit(productRegistry, "CheckpointAdded")
            .withArgs(1, 0, distributor.address, "shipped");
    });

    it("Should prevent unauthorized checkpoint", async function () {
        await productRegistry.connect(manufacturer).registerProduct(
            "Test Product",
            "pharmaceutical",
            "BATCH001",
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 86400 * 365,
            ["Material1"],
            "https://ipfs.io/ipfs/QmHash"
        );

        await expect(
            productRegistry.connect(retailer).addCheckpoint(
                1,
                "shipped",
                "Warehouse A",
                ""
            )
        ).to.be.revertedWith("Not authorized stakeholder");
    });
});
```

This smart contract architecture provides a robust foundation for the decentralized traceability platform, with comprehensive security measures, gas optimization, and extensibility for future enhancements.
