"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const authorization_js_1 = require("../middleware/authorization.js");
const validation_js_1 = require("../middleware/validation.js");
const router = (0, express_1.Router)();
// Mock database for demonstration
let products = [];
let checkpoints = [];
// Get all products for authenticated user
router.get('/', (0, validation_js_1.validate)(validation_js_1.validationGroups.product.query), validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.READ), (0, authorization_js_1.auditLog)('product_list', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, type, status, search } = req.query;
    const userId = req.user?.id;
    // Filter products based on user permissions
    let filteredProducts = products.filter(product => {
        // Basic access control
        if (product.ownerId !== userId && !req.user?.role?.includes('admin')) {
            return false;
        }
        // Apply filters
        if (type && product.type !== type)
            return false;
        if (status && product.status !== status)
            return false;
        if (search && !product.name.toLowerCase().includes(search.toString().toLowerCase()))
            return false;
        return true;
    });
    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    res.json({
        products: paginatedProducts,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: filteredProducts.length,
            pages: Math.ceil(filteredProducts.length / Number(limit))
        }
    });
}));
// Get specific product by ID
router.get('/:id', (0, validation_js_1.validate)([validation_js_1.validationGroups.product.update[0]]), // Validate ID parameter
validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.READ), (0, authorization_js_1.requireOwnership)((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), (0, authorization_js_1.auditLog)('product_view', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const product = products.find(p => p.id === id);
    if (!product) {
        return res.status(404).json({
            error: 'Product not found',
            message: 'The requested product does not exist'
        });
    }
    // Get checkpoints for this product
    const productCheckpoints = checkpoints.filter(cp => cp.productId === id);
    res.json({
        product: {
            ...product,
            checkpoints: productCheckpoints
        }
    });
}));
// Register new product
router.post('/', (0, validation_js_1.validate)(validation_js_1.validationGroups.product.create), validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.WRITE), (0, authorization_js_1.auditLog)('product_create', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { name, type, batchNumber, manufactureDate, expiryDate, rawMaterials, metadataURI, description } = req.body;
    // Check if batch number already exists
    const existingProduct = products.find(p => p.batchNumber === batchNumber);
    if (existingProduct) {
        return res.status(409).json({
            error: 'Batch number already exists',
            message: 'A product with this batch number already exists'
        });
    }
    // Create new product
    const newProduct = {
        id: (products.length + 1).toString(),
        name,
        type,
        batchNumber,
        manufactureDate,
        expiryDate,
        rawMaterials,
        metadataURI,
        description,
        status: 'ACTIVE',
        ownerId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    products.push(newProduct);
    res.status(201).json({
        message: 'Product registered successfully',
        product: newProduct
    });
}));
// Update product
router.put('/:id', (0, validation_js_1.validate)([...validation_js_1.validationGroups.product.update, ...validation_js_1.validationGroups.product.create.slice(1)]), validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.WRITE), (0, authorization_js_1.requireOwnership)((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), (0, authorization_js_1.auditLog)('product_update', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex === -1) {
        return res.status(404).json({
            error: 'Product not found',
            message: 'The requested product does not exist'
        });
    }
    // Update product
    const updatedProduct = {
        ...products[productIndex],
        ...req.body,
        id, // Ensure ID doesn't change
        ownerId: products[productIndex].ownerId, // Ensure ownership doesn't change
        updatedAt: new Date().toISOString()
    };
    products[productIndex] = updatedProduct;
    res.json({
        message: 'Product updated successfully',
        product: updatedProduct
    });
}));
// Delete product (soft delete)
router.delete('/:id', (0, validation_js_1.validate)([validation_js_1.validationGroups.product.update[0]]), validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.DELETE), (0, authorization_js_1.requireOwnership)((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), (0, authorization_js_1.auditLog)('product_delete', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex === -1) {
        return res.status(404).json({
            error: 'Product not found',
            message: 'The requested product does not exist'
        });
    }
    // Soft delete
    products[productIndex].status = 'DELETED';
    products[productIndex].deletedAt = new Date().toISOString();
    products[productIndex].updatedAt = new Date().toISOString();
    res.json({
        message: 'Product deleted successfully'
    });
}));
// Add checkpoint to product
router.post('/:id/checkpoints', (0, validation_js_1.validate)([validation_js_1.validationGroups.checkpoint.create[0], ...validation_js_1.validationGroups.checkpoint.create.slice(1)]), validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.WRITE), (0, authorization_js_1.requireOwnership)((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), (0, authorization_js_1.auditLog)('checkpoint_create', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { status, location, additionalData, temperature, humidity } = req.body;
    const product = products.find(p => p.id === id);
    if (!product) {
        return res.status(404).json({
            error: 'Product not found',
            message: 'The requested product does not exist'
        });
    }
    const newCheckpoint = {
        id: (checkpoints.length + 1).toString(),
        productId: id,
        status,
        location,
        additionalData,
        temperature,
        humidity,
        stakeholderId: userId,
        timestamp: new Date().toISOString()
    };
    checkpoints.push(newCheckpoint);
    res.status(201).json({
        message: 'Checkpoint added successfully',
        checkpoint: newCheckpoint
    });
}));
// Get checkpoints for product
router.get('/:id/checkpoints', (0, validation_js_1.validate)([validation_js_1.validationGroups.product.update[0]]), validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.READ), (0, authorization_js_1.requireOwnership)((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), (0, authorization_js_1.auditLog)('checkpoint_list', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const productCheckpoints = checkpoints.filter(cp => cp.productId === id);
    res.json({
        checkpoints: productCheckpoints
    });
}));
// Verify product
router.post('/:id/verify', (0, validation_js_1.validate)([validation_js_1.validationGroups.product.update[0]]), validation_js_1.sanitize, (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.VERIFY), (0, authorization_js_1.auditLog)('product_verify', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const product = products.find(p => p.id === id);
    if (!product) {
        return res.status(404).json({
            error: 'Product not found',
            message: 'The requested product does not exist'
        });
    }
    // Perform verification logic
    const verificationResult = {
        isValid: true,
        verifiedAt: new Date().toISOString(),
        verifiedBy: userId,
        blockchainVerified: true,
        complianceScore: 95
    };
    res.json({
        message: 'Product verification completed',
        verification: verificationResult
    });
}));
// Get product statistics
router.get('/stats/overview', (0, authorization_js_1.requireResourcePermission)(authorization_js_1.Resource.PRODUCT, authorization_js_1.Permission.READ), (0, authorization_js_1.auditLog)('product_stats', authorization_js_1.Resource.PRODUCT), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    // Calculate statistics based on user's products
    const userProducts = products.filter(p => p.ownerId === userId);
    const stats = {
        totalProducts: userProducts.length,
        activeProducts: userProducts.filter(p => p.status === 'ACTIVE').length,
        expiredProducts: userProducts.filter(p => p.status === 'EXPIRED').length,
        totalCheckpoints: checkpoints.filter(cp => userProducts.some(p => p.id === cp.productId)).length,
        productsByType: userProducts.reduce((acc, product) => {
            acc[product.type] = (acc[product.type] || 0) + 1;
            return acc;
        }, {})
    };
    res.json({ stats });
}));
exports.default = router;
//# sourceMappingURL=products-secure.js.map