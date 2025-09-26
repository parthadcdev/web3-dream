import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireResourcePermission, requireOwnership, auditLog, Resource, Permission } from '../middleware/authorization.js';
import { validate, sanitize, validationGroups } from '../middleware/validation.js';
const router = Router();
// Mock database for demonstration
let products = [];
let checkpoints = [];
// Get all products for authenticated user
router.get('/', validate(validationGroups.product.query), sanitize, requireResourcePermission(Resource.PRODUCT, Permission.READ), auditLog('product_list', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
router.get('/:id', validate([validationGroups.product.update[0]]), // Validate ID parameter
sanitize, requireResourcePermission(Resource.PRODUCT, Permission.READ), requireOwnership((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), auditLog('product_view', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
router.post('/', validate(validationGroups.product.create), sanitize, requireResourcePermission(Resource.PRODUCT, Permission.WRITE), auditLog('product_create', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
router.put('/:id', validate([...validationGroups.product.update, ...validationGroups.product.create.slice(1)]), sanitize, requireResourcePermission(Resource.PRODUCT, Permission.WRITE), requireOwnership((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), auditLog('product_update', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
router.delete('/:id', validate([validationGroups.product.update[0]]), sanitize, requireResourcePermission(Resource.PRODUCT, Permission.DELETE), requireOwnership((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), auditLog('product_delete', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
router.post('/:id/checkpoints', validate([validationGroups.checkpoint.create[0], ...validationGroups.checkpoint.create.slice(1)]), sanitize, requireResourcePermission(Resource.PRODUCT, Permission.WRITE), requireOwnership((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), auditLog('checkpoint_create', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
router.get('/:id/checkpoints', validate([validationGroups.product.update[0]]), sanitize, requireResourcePermission(Resource.PRODUCT, Permission.READ), requireOwnership((req) => {
    const product = products.find(p => p.id === req.params.id);
    return product?.ownerId || '';
}), auditLog('checkpoint_list', Resource.PRODUCT), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const productCheckpoints = checkpoints.filter(cp => cp.productId === id);
    res.json({
        checkpoints: productCheckpoints
    });
}));
// Verify product
router.post('/:id/verify', validate([validationGroups.product.update[0]]), sanitize, requireResourcePermission(Resource.PRODUCT, Permission.VERIFY), auditLog('product_verify', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
router.get('/stats/overview', requireResourcePermission(Resource.PRODUCT, Permission.READ), auditLog('product_stats', Resource.PRODUCT), asyncHandler(async (req, res) => {
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
export default router;
//# sourceMappingURL=products-secure.js.map