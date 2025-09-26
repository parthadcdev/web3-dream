// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract SimpleProductRegistry is Ownable, ReentrancyGuard, Pausable {
    struct Product {
        uint256 productId;
        string productName;
        string productType;
        address manufacturer;
        string batchNumber;
        uint256 manufactureDate;
        uint256 expiryDate;
        string[] rawMaterials;
        address[] stakeholders;
        bool isActive;
        string metadataURI;
    }

    struct Checkpoint {
        uint256 timestamp;
        string location;
        address stakeholder;
        string status;
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

    event ProductDeactivated(
        uint256 indexed productId,
        address indexed deactivatedBy
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

    modifier onlyStakeholder(uint256 _productId) {
        require(_productId > 0 && _productId < nextProductId, "Product does not exist");
        Product storage product = products[_productId];
        bool isStakeholder = false;
        for (uint256 i = 0; i < product.stakeholders.length; i++) {
            if (product.stakeholders[i] == msg.sender) {
                isStakeholder = true;
                break;
            }
        }
        require(isStakeholder, "Not authorized stakeholder");
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
    ) public whenNotPaused nonReentrant {
        require(bytes(_productName).length > 0, "Product name required");
        require(bytes(_batchNumber).length > 0, "Batch number required");
        require(_rawMaterials.length > 0, "Raw materials required");
        require(batchToProductId[_batchNumber] == 0, "Batch number already exists");

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
            stakeholders: new address[](0),
            isActive: true,
            metadataURI: _metadataURI
        });

        products[productId].stakeholders.push(msg.sender);
        stakeholderProducts[msg.sender].push(productId);
        batchToProductId[_batchNumber] = productId;
        totalProducts++;

        // Add initial checkpoint
        productCheckpoints[productId].push(Checkpoint({
            timestamp: block.timestamp,
            location: "Manufacturing Facility",
            stakeholder: msg.sender,
            status: "Registered",
            additionalData: "Product registered in system"
        }));

        emit ProductRegistered(productId, _productName, msg.sender, _batchNumber);
    }

    function getProduct(uint256 _productId) public view returns (Product memory) {
        require(_productId > 0 && _productId < nextProductId, "Product does not exist");
        return products[_productId];
    }

    function getProductIdByBatch(string memory _batchNumber) public view returns (uint256) {
        return batchToProductId[_batchNumber];
    }

    function getProductsByStakeholder(address _stakeholder) public view returns (uint256[] memory) {
        return stakeholderProducts[_stakeholder];
    }

    function addStakeholder(uint256 _productId, address _stakeholder) public onlyStakeholder(_productId) {
        require(_stakeholder != address(0), "Invalid stakeholder address");
        require(_stakeholder != msg.sender, "Cannot add yourself");

        Product storage product = products[_productId];
        for (uint256 i = 0; i < product.stakeholders.length; i++) {
            require(product.stakeholders[i] != _stakeholder, "Stakeholder already exists");
        }

        product.stakeholders.push(_stakeholder);
        stakeholderProducts[_stakeholder].push(_productId);

        emit StakeholderAdded(_productId, _stakeholder);
    }

    function addCheckpoint(
        uint256 _productId,
        string memory _status,
        string memory _location,
        string memory _additionalData
    ) public onlyStakeholder(_productId) whenNotPaused {
        require(bytes(_status).length > 0, "Status required");

        productCheckpoints[_productId].push(Checkpoint({
            timestamp: block.timestamp,
            location: _location,
            stakeholder: msg.sender,
            status: _status,
            additionalData: _additionalData
        }));

        emit CheckpointAdded(_productId, productCheckpoints[_productId].length - 1, msg.sender, _status);
    }

    function getCheckpoints(uint256 _productId) public view returns (Checkpoint[] memory) {
        require(_productId > 0 && _productId < nextProductId, "Product does not exist");
        return productCheckpoints[_productId];
    }

    function getLatestCheckpoint(uint256 _productId) public view returns (Checkpoint memory) {
        require(_productId > 0 && _productId < nextProductId, "Product does not exist");
        Checkpoint[] memory checkpoints = productCheckpoints[_productId];
        require(checkpoints.length > 0, "No checkpoints found");
        return checkpoints[checkpoints.length - 1];
    }

    function updateProductMetadata(uint256 _productId, string memory _newMetadataURI) public onlyStakeholder(_productId) {
        require(_productId > 0 && _productId < nextProductId, "Product does not exist");
        products[_productId].metadataURI = _newMetadataURI;
    }

    function deactivateProduct(uint256 _productId) public onlyStakeholder(_productId) {
        require(_productId > 0 && _productId < nextProductId, "Product does not exist");
        products[_productId].isActive = false;
        emit ProductDeactivated(_productId, msg.sender);
    }

    function emergencyPause() public onlyOwner {
        _pause();
    }

    function emergencyUnpause() public onlyOwner {
        _unpause();
    }
}
