// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// SafeMath removed in OpenZeppelin v5.0.0 - Solidity 0.8+ has built-in overflow protection

contract ProductRegistry is Ownable, ReentrancyGuard, Pausable {

    constructor() Ownable(msg.sender) {}

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

    event ProductUpdated(
        uint256 indexed productId,
        string productName,
        address indexed updater
    );

    event ProductDeleted(
        uint256 indexed productId,
        address indexed deleter
    );

    event StakeholderRemoved(
        uint256 indexed productId,
        address indexed stakeholder
    );

    event CheckpointUpdated(
        uint256 indexed productId,
        uint256 indexed checkpointIndex,
        address indexed updater
    );

    event ProductReactivated(
        uint256 indexed productId,
        address indexed reactivator
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

    modifier onlyManufacturerOrOwner(uint256 _productId) {
        require(
            products[_productId].manufacturer == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    modifier validCheckpointIndex(uint256 _productId, uint256 _checkpointIndex) {
        require(_checkpointIndex < productCheckpoints[_productId].length, "Invalid checkpoint index");
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

    // ============ CRUD OPERATIONS ============

    /**
     * @dev Update product information (only manufacturer or owner)
     * @param _productId Product ID to update
     * @param _productName New product name
     * @param _productType New product type
     * @param _expiryDate New expiry date
     * @param _rawMaterials New raw materials array
     * @param _metadataURI New metadata URI
     */
    function updateProduct(
        uint256 _productId,
        string memory _productName,
        string memory _productType,
        uint256 _expiryDate,
        string[] memory _rawMaterials,
        string memory _metadataURI
    ) external 
        validProductId(_productId)
        onlyManufacturerOrOwner(_productId)
        whenNotPaused 
        nonReentrant 
    {
        require(bytes(_productName).length > 0, "Product name required");
        require(_expiryDate > products[_productId].manufactureDate, "Expiry must be after manufacture");
        
        products[_productId].productName = _productName;
        products[_productId].productType = _productType;
        products[_productId].expiryDate = _expiryDate;
        products[_productId].rawMaterials = _rawMaterials;
        products[_productId].metadataURI = _metadataURI;

        emit ProductUpdated(_productId, _productName, msg.sender);
    }

    /**
     * @dev Soft delete a product (deactivate and mark as deleted)
     * @param _productId Product ID to delete
     */
    function deleteProduct(uint256 _productId) 
        external 
        validProductId(_productId)
        onlyManufacturerOrOwner(_productId)
        whenNotPaused 
        nonReentrant 
    {
        products[_productId].isActive = false;
        // Note: We don't actually delete the product data to maintain traceability
        // Instead, we mark it as inactive and emit a deletion event
        
        emit ProductDeleted(_productId, msg.sender);
    }

    /**
     * @dev Reactivate a previously deactivated product
     * @param _productId Product ID to reactivate
     */
    function reactivateProduct(uint256 _productId) 
        external 
        validProductId(_productId)
        onlyManufacturerOrOwner(_productId)
        whenNotPaused 
        nonReentrant 
    {
        require(!products[_productId].isActive, "Product already active");
        
        products[_productId].isActive = true;
        
        emit ProductReactivated(_productId, msg.sender);
    }

    /**
     * @dev Remove a stakeholder from a product
     * @param _productId Product ID
     * @param _stakeholder Address of stakeholder to remove
     */
    function removeStakeholder(uint256 _productId, address _stakeholder) 
        external 
        validProductId(_productId)
        onlyManufacturerOrOwner(_productId)
        whenNotPaused 
        nonReentrant 
    {
        require(_stakeholder != address(0), "Invalid stakeholder address");
        require(_stakeholder != products[_productId].manufacturer, "Cannot remove manufacturer");
        
        // Find and remove stakeholder
        bool found = false;
        for (uint256 i = 0; i < products[_productId].stakeholders.length; i++) {
            if (products[_productId].stakeholders[i] == _stakeholder) {
                // Move last element to current position and pop
                products[_productId].stakeholders[i] = products[_productId].stakeholders[products[_productId].stakeholders.length - 1];
                products[_productId].stakeholders.pop();
                found = true;
                break;
            }
        }
        
        require(found, "Stakeholder not found");
        
        // Remove from stakeholder's product list
        _removeFromStakeholderProducts(_stakeholder, _productId);
        
        emit StakeholderRemoved(_productId, _stakeholder);
    }

    /**
     * @dev Update a specific checkpoint
     * @param _productId Product ID
     * @param _checkpointIndex Index of checkpoint to update
     * @param _status New status
     * @param _location New location
     * @param _temperature New temperature
     * @param _humidity New humidity
     * @param _additionalData New additional data
     */
    function updateCheckpoint(
        uint256 _productId,
        uint256 _checkpointIndex,
        string memory _status,
        string memory _location,
        string memory _temperature,
        string memory _humidity,
        string memory _additionalData
    ) external 
        validProductId(_productId)
        validCheckpointIndex(_productId, _checkpointIndex)
        onlyStakeholder(_productId)
        whenNotPaused 
        nonReentrant 
    {
        require(bytes(_status).length > 0, "Status required");
        
        Checkpoint storage checkpoint = productCheckpoints[_productId][_checkpointIndex];
        
        // Only allow the original stakeholder or owner to update
        require(
            checkpoint.stakeholder == msg.sender || msg.sender == owner(),
            "Not authorized to update this checkpoint"
        );
        
        checkpoint.status = _status;
        checkpoint.location = _location;
        checkpoint.temperature = _temperature;
        checkpoint.humidity = _humidity;
        checkpoint.additionalData = _additionalData;
        
        emit CheckpointUpdated(_productId, _checkpointIndex, msg.sender);
    }

    /**
     * @dev Add checkpoint with environmental data
     * @param _productId Product ID
     * @param _status Checkpoint status
     * @param _location Location
     * @param _temperature Temperature reading
     * @param _humidity Humidity reading
     * @param _additionalData Additional data
     */
    function addCheckpointWithEnvironment(
        uint256 _productId,
        string memory _status,
        string memory _location,
        string memory _temperature,
        string memory _humidity,
        string memory _additionalData
    ) external 
        onlyStakeholder(_productId) 
        whenNotPaused 
        nonReentrant 
    {
        require(bytes(_status).length > 0, "Status required");

        Checkpoint memory newCheckpoint = Checkpoint({
            timestamp: block.timestamp,
            location: _location,
            stakeholder: msg.sender,
            status: _status,
            temperature: _temperature,
            humidity: _humidity,
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

    // ============ BATCH OPERATIONS ============

    /**
     * @dev Register multiple products in a single transaction
     * @param _products Array of product data
     * @return productIds Array of created product IDs
     */
    function batchRegisterProducts(
        ProductData[] memory _products
    ) external 
        whenNotPaused 
        nonReentrant 
        returns (uint256[] memory productIds) 
    {
        require(_products.length > 0, "No products provided");
        require(_products.length <= 50, "Too many products in batch");
        
        productIds = new uint256[](_products.length);
        
        for (uint256 i = 0; i < _products.length; i++) {
            productIds[i] = _registerSingleProduct(_products[i]);
        }
        
        return productIds;
    }

    /**
     * @dev Add multiple checkpoints for a product
     * @param _productId Product ID
     * @param _checkpoints Array of checkpoint data
     */
    function batchAddCheckpoints(
        uint256 _productId,
        CheckpointData[] memory _checkpoints
    ) external 
        onlyStakeholder(_productId) 
        whenNotPaused 
        nonReentrant 
    {
        require(_checkpoints.length > 0, "No checkpoints provided");
        require(_checkpoints.length <= 20, "Too many checkpoints in batch");
        
        for (uint256 i = 0; i < _checkpoints.length; i++) {
            require(bytes(_checkpoints[i].status).length > 0, "Status required");
            
            Checkpoint memory newCheckpoint = Checkpoint({
                timestamp: block.timestamp,
                location: _checkpoints[i].location,
                stakeholder: msg.sender,
                status: _checkpoints[i].status,
                temperature: _checkpoints[i].temperature,
                humidity: _checkpoints[i].humidity,
                additionalData: _checkpoints[i].additionalData
            });

            productCheckpoints[_productId].push(newCheckpoint);

            emit CheckpointAdded(
                _productId,
                productCheckpoints[_productId].length - 1,
                msg.sender,
                _checkpoints[i].status
            );
        }
    }

    // ============ SEARCH AND FILTER OPERATIONS ============

    /**
     * @dev Get products by manufacturer
     * @param _manufacturer Manufacturer address
     * @return productIds Array of product IDs
     */
    function getProductsByManufacturer(address _manufacturer) 
        external 
        view 
        returns (uint256[] memory productIds) 
    {
        uint256[] memory allProducts = stakeholderProducts[_manufacturer];
        uint256 count = 0;
        
        // Count active products
        for (uint256 i = 0; i < allProducts.length; i++) {
            if (products[allProducts[i]].manufacturer == _manufacturer && products[allProducts[i]].isActive) {
                count++;
            }
        }
        
        productIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allProducts.length; i++) {
            if (products[allProducts[i]].manufacturer == _manufacturer && products[allProducts[i]].isActive) {
                productIds[index] = allProducts[i];
                index++;
            }
        }
        
        return productIds;
    }

    /**
     * @dev Get products by type
     * @param _productType Product type to filter by
     * @return productIds Array of product IDs
     */
    function getProductsByType(string memory _productType) 
        external 
        view 
        returns (uint256[] memory productIds) 
    {
        uint256 count = 0;
        
        // Count products of this type
        for (uint256 i = 1; i < nextProductId; i++) {
            if (keccak256(bytes(products[i].productType)) == keccak256(bytes(_productType)) && products[i].isActive) {
                count++;
            }
        }
        
        productIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextProductId; i++) {
            if (keccak256(bytes(products[i].productType)) == keccak256(bytes(_productType)) && products[i].isActive) {
                productIds[index] = i;
                index++;
            }
        }
        
        return productIds;
    }

    /**
     * @dev Get products by batch number
     * @param _batchNumber Batch number to search for
     * @return productId Product ID (0 if not found)
     */
    function getProductByBatchNumber(string memory _batchNumber) 
        external 
        view 
        returns (uint256 productId) 
    {
        productId = batchToProductId[_batchNumber];
        if (productId > 0 && !products[productId].isActive) {
            productId = 0; // Return 0 if product is inactive
        }
        return productId;
    }

    /**
     * @dev Get active products count
     * @return count Number of active products
     */
    function getActiveProductsCount() external view returns (uint256 count) {
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].isActive) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get products in a date range
     * @param _startDate Start date (timestamp)
     * @param _endDate End date (timestamp)
     * @return productIds Array of product IDs
     */
    function getProductsInDateRange(uint256 _startDate, uint256 _endDate) 
        external 
        view 
        returns (uint256[] memory productIds) 
    {
        require(_startDate <= _endDate, "Invalid date range");
        
        uint256 count = 0;
        
        // Count products in date range
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].manufactureDate >= _startDate && 
                products[i].manufactureDate <= _endDate && 
                products[i].isActive) {
                count++;
            }
        }
        
        productIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].manufactureDate >= _startDate && 
                products[i].manufactureDate <= _endDate && 
                products[i].isActive) {
                productIds[index] = i;
                index++;
            }
        }
        
        return productIds;
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @dev Get product summary (lightweight version)
     * @param _productId Product ID
     * @return summary Product summary
     */
    function getProductSummary(uint256 _productId) 
        external 
        view 
        validProductId(_productId)
        returns (ProductSummary memory summary) 
    {
        Product memory product = products[_productId];
        Checkpoint[] memory checkpoints = productCheckpoints[_productId];
        
        summary = ProductSummary({
            productId: product.productId,
            productName: product.productName,
            productType: product.productType,
            manufacturer: product.manufacturer,
            batchNumber: product.batchNumber,
            manufactureDate: product.manufactureDate,
            expiryDate: product.expiryDate,
            isActive: product.isActive,
            checkpointCount: checkpoints.length,
            stakeholderCount: product.stakeholders.length,
            lastCheckpointTimestamp: checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].timestamp : 0
        });
        
        return summary;
    }

    /**
     * @dev Check if a product is expired
     * @param _productId Product ID
     * @return isExpired True if product is expired
     */
    function isProductExpired(uint256 _productId) 
        external 
        view 
        validProductId(_productId)
        returns (bool isExpired) 
    {
        return block.timestamp > products[_productId].expiryDate;
    }

    /**
     * @dev Get product traceability chain
     * @param _productId Product ID
     * @return traceChain Array of traceability data
     */
    function getProductTraceChain(uint256 _productId) 
        external 
        view 
        validProductId(_productId)
        returns (TraceabilityData[] memory traceChain) 
    {
        Checkpoint[] memory checkpoints = productCheckpoints[_productId];
        traceChain = new TraceabilityData[](checkpoints.length);
        
        for (uint256 i = 0; i < checkpoints.length; i++) {
            traceChain[i] = TraceabilityData({
                timestamp: checkpoints[i].timestamp,
                location: checkpoints[i].location,
                stakeholder: checkpoints[i].stakeholder,
                status: checkpoints[i].status,
                temperature: checkpoints[i].temperature,
                humidity: checkpoints[i].humidity,
                additionalData: checkpoints[i].additionalData
            });
        }
        
        return traceChain;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Internal function to register a single product
     * @param _productData Product data
     * @return productId Created product ID
     */
    function _registerSingleProduct(ProductData memory _productData) 
        internal 
        returns (uint256 productId) 
    {
        require(bytes(_productData.productName).length > 0, "Product name required");
        require(_productData.manufactureDate > 0, "Invalid manufacture date");
        require(_productData.expiryDate > _productData.manufactureDate, "Expiry must be after manufacture");
        require(batchToProductId[_productData.batchNumber] == 0, "Batch number already exists");

        productId = nextProductId++;
        
        // Create stakeholders array
        address[] memory initialStakeholders = new address[](1);
        initialStakeholders[0] = msg.sender;
        
        products[productId] = Product({
            productId: productId,
            productName: _productData.productName,
            productType: _productData.productType,
            manufacturer: msg.sender,
            batchNumber: _productData.batchNumber,
            manufactureDate: _productData.manufactureDate,
            expiryDate: _productData.expiryDate,
            rawMaterials: _productData.rawMaterials,
            stakeholders: initialStakeholders,
            isActive: true,
            metadataURI: _productData.metadataURI
        });

        batchToProductId[_productData.batchNumber] = productId;
        stakeholderProducts[msg.sender].push(productId);
        totalProducts++;

        // Add initial checkpoint
        addCheckpoint(productId, "manufactured", "Manufacturing facility", "");

        emit ProductRegistered(productId, _productData.productName, msg.sender, _productData.batchNumber);
        
        return productId;
    }

    /**
     * @dev Internal function to remove product from stakeholder's list
     * @param _stakeholder Stakeholder address
     * @param _productId Product ID to remove
     */
    function _removeFromStakeholderProducts(address _stakeholder, uint256 _productId) internal {
        uint256[] storage stakeholderProductList = stakeholderProducts[_stakeholder];
        
        for (uint256 i = 0; i < stakeholderProductList.length; i++) {
            if (stakeholderProductList[i] == _productId) {
                stakeholderProductList[i] = stakeholderProductList[stakeholderProductList.length - 1];
                stakeholderProductList.pop();
                break;
            }
        }
    }

    // ============ DATA STRUCTURES ============

    struct ProductData {
        string productName;
        string productType;
        string batchNumber;
        uint256 manufactureDate;
        uint256 expiryDate;
        string[] rawMaterials;
        string metadataURI;
    }

    struct CheckpointData {
        string status;
        string location;
        string temperature;
        string humidity;
        string additionalData;
    }

    struct ProductSummary {
        uint256 productId;
        string productName;
        string productType;
        address manufacturer;
        string batchNumber;
        uint256 manufactureDate;
        uint256 expiryDate;
        bool isActive;
        uint256 checkpointCount;
        uint256 stakeholderCount;
        uint256 lastCheckpointTimestamp;
    }

    struct TraceabilityData {
        uint256 timestamp;
        string location;
        address stakeholder;
        string status;
        string temperature;
        string humidity;
        string additionalData;
    }
}
