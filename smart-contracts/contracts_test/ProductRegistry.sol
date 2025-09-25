// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ProductRegistry is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    struct Product {
        uint256 productId;
        string productName;
        string productType; // "pharmaceutical", "luxury", "electronics"
        address manufacturer;
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

    event StakeholderAdded(
        uint256 indexed productId,
        address indexed stakeholder
    );

    modifier validProductId(uint256 _productId) {
        require(_productId > 0 && _productId < nextProductId, "Product not found");
        _;
    }

    modifier onlyStakeholder(uint256 _productId) {
        require(products[_productId].isActive, "Product not active");
        bool isStakeholder = false;
        for (uint256 i = 0; i < products[_productId].stakeholders.length; i++) {
            if (products[_productId].stakeholders[i] == msg.sender) {
                isStakeholder = true;
                break;
            }
        }
        require(isStakeholder || msg.sender == owner(), "Not authorized stakeholder");
        _;
    }

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
        require(batchToProductId[_batchNumber] == 0, "Batch number already exists");

        uint256 productId = nextProductId++;
        
        // Create stakeholders array
        address[] memory initialStakeholders = new address[](1);
        initialStakeholders[0] = msg.sender;
        
        products[productId] = Product({
            productId: productId,
            productName: _productName,
            productType: _productType,
            manufacturer: msg.sender,
            batchNumber: _batchNumber,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            rawMaterials: _rawMaterials,
            stakeholders: initialStakeholders,
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
    ) public onlyStakeholder(_productId) whenNotPaused {
        require(bytes(_status).length > 0, "Status required");

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
        onlyStakeholder(_productId)
        whenNotPaused 
        nonReentrant 
    {
        require(_stakeholder != address(0), "Invalid stakeholder address");
        require(_stakeholder != msg.sender, "Cannot add yourself");
        
        // Check if stakeholder already exists
        for (uint256 i = 0; i < products[_productId].stakeholders.length; i++) {
            require(products[_productId].stakeholders[i] != _stakeholder, "Stakeholder already exists");
        }

        products[_productId].stakeholders.push(_stakeholder);
        stakeholderProducts[_stakeholder].push(_productId);

        emit StakeholderAdded(_productId, _stakeholder);
    }

    function getProduct(uint256 _productId) external view validProductId(_productId) returns (Product memory) {
        return products[_productId];
    }

    function getCheckpoints(uint256 _productId) external view validProductId(_productId) returns (Checkpoint[] memory) {
        return productCheckpoints[_productId];
    }

    function getStakeholderProducts(address _stakeholder) external view returns (uint256[] memory) {
        return stakeholderProducts[_stakeholder];
    }

    function getProductCount() external view returns (uint256) {
        return totalProducts;
    }

    function deactivateProduct(uint256 _productId) external validProductId(_productId) {
        require(products[_productId].manufacturer == msg.sender || msg.sender == owner(), "Not authorized");
        
        products[_productId].isActive = false;
    }

    function emergencyPause() external onlyOwner {
        _pause();
    }

    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    function updateMetadataURI(uint256 _productId, string memory _newMetadataURI) 
        external 
        onlyStakeholder(_productId) 
        whenNotPaused 
    {
        products[_productId].metadataURI = _newMetadataURI;
    }
}
