# ProductRegistry CRUD API Documentation

## Overview

The ProductRegistry contract provides comprehensive CRUD (Create, Read, Update, Delete) operations for managing products in the supply chain traceability system. This document outlines all available functions, their parameters, return values, and usage examples.

## Contract Address

```
ProductRegistry: 0x[ContractAddress]
```

## Core Data Structures

### Product
```solidity
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
```

### Checkpoint
```solidity
struct Checkpoint {
    uint256 timestamp;
    string location;
    address stakeholder;
    string status;
    string temperature;
    string humidity;
    string additionalData;
}
```

## CREATE Operations

### 1. Register Product
**Function**: `registerProduct`
**Description**: Register a new product in the system
**Access**: Public (when not paused)

```solidity
function registerProduct(
    string memory _productName,
    string memory _productType,
    string memory _batchNumber,
    uint256 _manufactureDate,
    uint256 _expiryDate,
    string[] memory _rawMaterials,
    string memory _metadataURI
) external returns (uint256)
```

**Parameters**:
- `_productName`: Name of the product
- `_productType`: Type of product (e.g., "pharmaceutical", "electronics")
- `_batchNumber`: Unique batch identifier
- `_manufactureDate`: Unix timestamp of manufacture date
- `_expiryDate`: Unix timestamp of expiry date
- `_rawMaterials`: Array of raw material names
- `_metadataURI`: IPFS URI for product metadata

**Returns**: `uint256` - Product ID

**Events**:
- `ProductRegistered(uint256 indexed productId, string productName, address indexed manufacturer, string batchNumber)`

**Example**:
```javascript
const tx = await productRegistry.registerProduct(
    "Organic Cotton T-Shirt",
    "clothing",
    "BATCH-2024-001",
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000) + 86400 * 365,
    ["Organic Cotton", "Natural Dyes"],
    "https://ipfs.io/ipfs/QmHash"
);
```

### 2. Batch Register Products
**Function**: `batchRegisterProducts`
**Description**: Register multiple products in a single transaction
**Access**: Public (when not paused)

```solidity
function batchRegisterProducts(
    ProductData[] memory _products
) external returns (uint256[] memory productIds)
```

**Parameters**:
- `_products`: Array of ProductData structures

**Returns**: `uint256[]` - Array of created product IDs

**Example**:
```javascript
const products = [
    {
        productName: "Product 1",
        productType: "pharmaceutical",
        batchNumber: "BATCH-001",
        manufactureDate: Math.floor(Date.now() / 1000),
        expiryDate: Math.floor(Date.now() / 1000) + 86400 * 365,
        rawMaterials: ["Material1"],
        metadataURI: "https://ipfs.io/ipfs/Hash1"
    },
    {
        productName: "Product 2",
        productType: "electronics",
        batchNumber: "BATCH-002",
        manufactureDate: Math.floor(Date.now() / 1000),
        expiryDate: Math.floor(Date.now() / 1000) + 86400 * 365,
        rawMaterials: ["Material2"],
        metadataURI: "https://ipfs.io/ipfs/Hash2"
    }
];

const productIds = await productRegistry.batchRegisterProducts(products);
```

## READ Operations

### 1. Get Product
**Function**: `getProduct`
**Description**: Retrieve complete product information
**Access**: Public

```solidity
function getProduct(uint256 _productId) external view returns (Product memory)
```

**Parameters**:
- `_productId`: Product ID to retrieve

**Returns**: `Product` - Complete product structure

**Example**:
```javascript
const product = await productRegistry.getProduct(1);
console.log(product.productName); // "Organic Cotton T-Shirt"
console.log(product.manufacturer); // "0x..."
```

### 2. Get Product Summary
**Function**: `getProductSummary`
**Description**: Get lightweight product summary
**Access**: Public

```solidity
function getProductSummary(uint256 _productId) external view returns (ProductSummary memory)
```

**Returns**: `ProductSummary` - Lightweight product data

**Example**:
```javascript
const summary = await productRegistry.getProductSummary(1);
console.log(summary.checkpointCount); // Number of checkpoints
console.log(summary.stakeholderCount); // Number of stakeholders
```

### 3. Get Products by Manufacturer
**Function**: `getProductsByManufacturer`
**Description**: Get all products by a specific manufacturer
**Access**: Public

```solidity
function getProductsByManufacturer(address _manufacturer) external view returns (uint256[] memory)
```

**Parameters**:
- `_manufacturer`: Manufacturer address

**Returns**: `uint256[]` - Array of product IDs

**Example**:
```javascript
const productIds = await productRegistry.getProductsByManufacturer(manufacturerAddress);
```

### 4. Get Products by Type
**Function**: `getProductsByType`
**Description**: Get all products of a specific type
**Access**: Public

```solidity
function getProductsByType(string memory _productType) external view returns (uint256[] memory)
```

**Parameters**:
- `_productType`: Product type to filter by

**Returns**: `uint256[]` - Array of product IDs

**Example**:
```javascript
const pharmaProducts = await productRegistry.getProductsByType("pharmaceutical");
```

### 5. Get Product by Batch Number
**Function**: `getProductByBatchNumber`
**Description**: Find product by batch number
**Access**: Public

```solidity
function getProductByBatchNumber(string memory _batchNumber) external view returns (uint256)
```

**Parameters**:
- `_batchNumber`: Batch number to search for

**Returns**: `uint256` - Product ID (0 if not found)

**Example**:
```javascript
const productId = await productRegistry.getProductByBatchNumber("BATCH-2024-001");
```

### 6. Get Products in Date Range
**Function**: `getProductsInDateRange`
**Description**: Get products manufactured within a date range
**Access**: Public

```solidity
function getProductsInDateRange(uint256 _startDate, uint256 _endDate) external view returns (uint256[] memory)
```

**Parameters**:
- `_startDate`: Start date (Unix timestamp)
- `_endDate`: End date (Unix timestamp)

**Returns**: `uint256[]` - Array of product IDs

**Example**:
```javascript
const startDate = Math.floor(Date.now() / 1000) - 86400; // Yesterday
const endDate = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
const productIds = await productRegistry.getProductsInDateRange(startDate, endDate);
```

### 7. Get Checkpoints
**Function**: `getCheckpoints`
**Description**: Get all checkpoints for a product
**Access**: Public

```solidity
function getCheckpoints(uint256 _productId) external view returns (Checkpoint[] memory)
```

**Parameters**:
- `_productId`: Product ID

**Returns**: `Checkpoint[]` - Array of checkpoints

**Example**:
```javascript
const checkpoints = await productRegistry.getCheckpoints(1);
console.log(checkpoints[0].status); // "manufactured"
```

### 8. Get Product Trace Chain
**Function**: `getProductTraceChain`
**Description**: Get complete traceability chain for a product
**Access**: Public

```solidity
function getProductTraceChain(uint256 _productId) external view returns (TraceabilityData[] memory)
```

**Parameters**:
- `_productId`: Product ID

**Returns**: `TraceabilityData[]` - Array of traceability data

**Example**:
```javascript
const traceChain = await productRegistry.getProductTraceChain(1);
```

## UPDATE Operations

### 1. Update Product
**Function**: `updateProduct`
**Description**: Update product information (manufacturer or owner only)
**Access**: Manufacturer or Owner

```solidity
function updateProduct(
    uint256 _productId,
    string memory _productName,
    string memory _productType,
    uint256 _expiryDate,
    string[] memory _rawMaterials,
    string memory _metadataURI
) external
```

**Parameters**:
- `_productId`: Product ID to update
- `_productName`: New product name
- `_productType`: New product type
- `_expiryDate`: New expiry date
- `_rawMaterials`: New raw materials array
- `_metadataURI`: New metadata URI

**Events**:
- `ProductUpdated(uint256 indexed productId, string productName, address indexed updater)`

**Example**:
```javascript
await productRegistry.updateProduct(
    1,
    "Updated Product Name",
    "electronics",
    Math.floor(Date.now() / 1000) + 86400 * 730, // 2 years
    ["New Material1", "New Material2"],
    "https://ipfs.io/ipfs/NewHash"
);
```

### 2. Update Checkpoint
**Function**: `updateCheckpoint`
**Description**: Update a specific checkpoint
**Access**: Stakeholder or Owner

```solidity
function updateCheckpoint(
    uint256 _productId,
    uint256 _checkpointIndex,
    string memory _status,
    string memory _location,
    string memory _temperature,
    string memory _humidity,
    string memory _additionalData
) external
```

**Parameters**:
- `_productId`: Product ID
- `_checkpointIndex`: Index of checkpoint to update
- `_status`: New status
- `_location`: New location
- `_temperature`: New temperature
- `_humidity`: New humidity
- `_additionalData`: New additional data

**Events**:
- `CheckpointUpdated(uint256 indexed productId, uint256 indexed checkpointIndex, address indexed updater)`

**Example**:
```javascript
await productRegistry.updateCheckpoint(
    1,
    0, // First checkpoint
    "updated_manufactured",
    "Updated Manufacturing Facility",
    "22°C",
    "45%",
    "Updated production data"
);
```

### 3. Add Checkpoint with Environment
**Function**: `addCheckpointWithEnvironment`
**Description**: Add checkpoint with environmental data
**Access**: Stakeholder

```solidity
function addCheckpointWithEnvironment(
    uint256 _productId,
    string memory _status,
    string memory _location,
    string memory _temperature,
    string memory _humidity,
    string memory _additionalData
) external
```

**Example**:
```javascript
await productRegistry.addCheckpointWithEnvironment(
    1,
    "quality_check",
    "Quality Control Lab",
    "22°C",
    "45%",
    "Quality test passed"
);
```

### 4. Batch Add Checkpoints
**Function**: `batchAddCheckpoints`
**Description**: Add multiple checkpoints in a single transaction
**Access**: Stakeholder

```solidity
function batchAddCheckpoints(
    uint256 _productId,
    CheckpointData[] memory _checkpoints
) external
```

**Example**:
```javascript
const checkpoints = [
    {
        status: "packaged",
        location: "Packaging Facility",
        temperature: "20°C",
        humidity: "40%",
        additionalData: "Packaged for shipment"
    },
    {
        status: "shipped",
        location: "Distribution Center",
        temperature: "18°C",
        humidity: "35%",
        additionalData: "Shipped to retailer"
    }
];

await productRegistry.batchAddCheckpoints(1, checkpoints);
```

## DELETE Operations

### 1. Delete Product (Soft Delete)
**Function**: `deleteProduct`
**Description**: Soft delete a product (deactivate)
**Access**: Manufacturer or Owner

```solidity
function deleteProduct(uint256 _productId) external
```

**Parameters**:
- `_productId`: Product ID to delete

**Events**:
- `ProductDeleted(uint256 indexed productId, address indexed deleter)`

**Example**:
```javascript
await productRegistry.deleteProduct(1);
```

### 2. Reactivate Product
**Function**: `reactivateProduct`
**Description**: Reactivate a previously deleted product
**Access**: Manufacturer or Owner

```solidity
function reactivateProduct(uint256 _productId) external
```

**Parameters**:
- `_productId`: Product ID to reactivate

**Events**:
- `ProductReactivated(uint256 indexed productId, address indexed reactivator)`

**Example**:
```javascript
await productRegistry.reactivateProduct(1);
```

### 3. Remove Stakeholder
**Function**: `removeStakeholder`
**Description**: Remove a stakeholder from a product
**Access**: Manufacturer or Owner

```solidity
function removeStakeholder(uint256 _productId, address _stakeholder) external
```

**Parameters**:
- `_productId`: Product ID
- `_stakeholder`: Stakeholder address to remove

**Events**:
- `StakeholderRemoved(uint256 indexed productId, address indexed stakeholder)`

**Example**:
```javascript
await productRegistry.removeStakeholder(1, stakeholderAddress);
```

## Utility Functions

### 1. Check Product Expiry
**Function**: `isProductExpired`
**Description**: Check if a product is expired
**Access**: Public

```solidity
function isProductExpired(uint256 _productId) external view returns (bool)
```

**Example**:
```javascript
const isExpired = await productRegistry.isProductExpired(1);
```

### 2. Get Active Products Count
**Function**: `getActiveProductsCount`
**Description**: Get count of active products
**Access**: Public

```solidity
function getActiveProductsCount() external view returns (uint256)
```

**Example**:
```javascript
const activeCount = await productRegistry.getActiveProductsCount();
```

### 3. Get Product Count
**Function**: `getProductCount`
**Description**: Get total number of products (including inactive)
**Access**: Public

```solidity
function getProductCount() external view returns (uint256)
```

**Example**:
```javascript
const totalCount = await productRegistry.getProductCount();
```

## Access Control

### Roles and Permissions

| Operation | Manufacturer | Owner | Stakeholder | Public |
|-----------|-------------|-------|-------------|--------|
| Register Product | ✅ | ✅ | ❌ | ✅ |
| Update Product | ✅ | ✅ | ❌ | ❌ |
| Delete Product | ✅ | ✅ | ❌ | ❌ |
| Add Checkpoint | ✅ | ✅ | ✅ | ❌ |
| Update Checkpoint | ✅ | ✅ | ✅ | ❌ |
| Add Stakeholder | ✅ | ✅ | ❌ | ❌ |
| Remove Stakeholder | ✅ | ✅ | ❌ | ❌ |
| Read Operations | ✅ | ✅ | ✅ | ✅ |

### Modifiers

- `validProductId`: Ensures product exists
- `onlyStakeholder`: Requires stakeholder or owner access
- `onlyManufacturerOrOwner`: Requires manufacturer or owner access
- `validCheckpointIndex`: Ensures checkpoint exists

## Events

### Product Events
- `ProductRegistered(uint256 indexed productId, string productName, address indexed manufacturer, string batchNumber)`
- `ProductUpdated(uint256 indexed productId, string productName, address indexed updater)`
- `ProductDeleted(uint256 indexed productId, address indexed deleter)`
- `ProductReactivated(uint256 indexed productId, address indexed reactivator)`

### Checkpoint Events
- `CheckpointAdded(uint256 indexed productId, uint256 checkpointIndex, address indexed stakeholder, string status)`
- `CheckpointUpdated(uint256 indexed productId, uint256 indexed checkpointIndex, address indexed updater)`

### Stakeholder Events
- `StakeholderAdded(uint256 indexed productId, address indexed stakeholder)`
- `StakeholderRemoved(uint256 indexed productId, address indexed stakeholder)`

## Error Handling

### Common Errors

| Error | Description | Solution |
|-------|-------------|----------|
| "Product not found" | Invalid product ID | Use valid product ID |
| "Not authorized" | Insufficient permissions | Check access control |
| "Product already active" | Product is already active | Check product status |
| "Batch number already exists" | Duplicate batch number | Use unique batch number |
| "Invalid date range" | Invalid date parameters | Check date values |
| "Too many products in batch" | Batch size exceeded | Reduce batch size |

## Gas Optimization

### Batch Operations
- Use `batchRegisterProducts` for multiple product registrations
- Use `batchAddCheckpoints` for multiple checkpoint additions
- Batch operations reduce gas costs significantly

### View Functions
- Use `getProductSummary` instead of `getProduct` for lightweight data
- Use specific search functions instead of iterating through all products

## Best Practices

### 1. Input Validation
- Always validate input parameters before calling functions
- Check for empty strings and zero addresses
- Validate date ranges and batch numbers

### 2. Error Handling
- Implement proper error handling in frontend applications
- Check transaction receipts for events
- Handle revert conditions gracefully

### 3. Gas Management
- Use batch operations when possible
- Consider gas costs for large arrays
- Implement pagination for large datasets

### 4. Security
- Verify caller permissions before sensitive operations
- Use proper access control modifiers
- Implement input sanitization

## Integration Examples

### Frontend Integration
```javascript
// Register a product
const registerProduct = async (productData) => {
    try {
        const tx = await productRegistry.registerProduct(
            productData.name,
            productData.type,
            productData.batchNumber,
            productData.manufactureDate,
            productData.expiryDate,
            productData.rawMaterials,
            productData.metadataURI
        );
        await tx.wait();
        return tx;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
};

// Get product with error handling
const getProduct = async (productId) => {
    try {
        const product = await productRegistry.getProduct(productId);
        return product;
    } catch (error) {
        if (error.message.includes('Product not found')) {
            return null;
        }
        throw error;
    }
};
```

### Backend Integration
```javascript
// Batch register products
const batchRegisterProducts = async (products) => {
    const productData = products.map(product => ({
        productName: product.name,
        productType: product.type,
        batchNumber: product.batchNumber,
        manufactureDate: product.manufactureDate,
        expiryDate: product.expiryDate,
        rawMaterials: product.rawMaterials,
        metadataURI: product.metadataURI
    }));

    const tx = await productRegistry.batchRegisterProducts(productData);
    await tx.wait();
    return tx;
};
```

## Testing

### Unit Tests
```javascript
describe('ProductRegistry CRUD', function() {
    it('Should register and retrieve product', async function() {
        // Test implementation
    });
    
    it('Should update product information', async function() {
        // Test implementation
    });
    
    it('Should handle batch operations', async function() {
        // Test implementation
    });
});
```

### Integration Tests
```javascript
describe('ProductRegistry Integration', function() {
    it('Should complete full product lifecycle', async function() {
        // Test complete workflow
    });
});
```

## Support

For technical support and questions:
- **Documentation**: [TraceChain Docs](https://docs.tracechain.com)
- **Discord**: [TraceChain Community](https://discord.gg/tracechain)
- **Email**: support@tracechain.com
- **GitHub Issues**: [Report Issues](https://github.com/tracechain/smart-contracts/issues)
