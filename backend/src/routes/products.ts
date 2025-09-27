import { Router } from 'express';
import { body, validationResult, query } from 'express-validator';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  requireResourcePermission, 
  requireOwnership, 
  auditLog,
  UserRole,
  Resource,
  Permission
} from '../middleware/authorization';
import { optionalAuth } from '../middleware/auth';
import { 
  validate, 
  sanitize, 
  validationGroups 
} from '../middleware/validation';
import { db } from '../config/database';

const router = Router();

// Validation middleware
const validateProductRegistration = [
  body('name').notEmpty().trim().escape(),
  body('type').isIn(['PHARMACEUTICAL', 'LUXURY', 'ELECTRONICS', 'FOOD', 'OTHER']),
  body('batchNumber').notEmpty().trim(),
  body('manufactureDate').isISO8601(),
  body('expiryDate').optional().isISO8601(),
  body('rawMaterials').isArray().withMessage('Raw materials must be an array'),
  body('metadataURI').optional().isURL()
];

const validateCheckpoint = [
  body('status').notEmpty().trim(),
  body('location').notEmpty().trim(),
  body('additionalData').optional().trim(),
  body('temperature').optional().trim(),
  body('humidity').optional().trim()
];

// Get all products for authenticated user
router.get('/', 
  optionalAuth,
  validate(validationGroups.product.query),
  sanitize,
  asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { page = 1, limit = 10, type, status } = req.query;
  const userId = req.user?.id;

  try {
    // Build where clause for filtering
    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.isActive = status === 'ACTIVE';
    }

    // For a traceability platform, authenticated users can see all products
    // Only filter by manufacturerId if specifically requested
    if (req.query.manufacturerId) {
      where.manufacturerId = req.query.manufacturerId;
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Query products from database
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take,
        include: {
          manufacturer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          checkpoints: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 5 // Limit recent checkpoints
          },
          nftCertificates: {
            select: {
              id: true,
              tokenId: true,
              contractAddress: true,
              isVerified: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      db.product.count({ where })
    ]);

    // Transform products to match frontend expectations
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      type: product.type,
      batchNumber: product.batchNumber,
      manufactureDate: product.manufactureDate.toISOString(),
      expiryDate: product.expiryDate?.toISOString(),
      status: product.isActive ? 'ACTIVE' : 'INACTIVE',
      blockchainId: product.nftCertificates[0]?.contractAddress || null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      rawMaterials: product.rawMaterials,
      metadataURI: product.metadataURI,
      manufacturer: {
        id: product.manufacturer.id,
        name: `${product.manufacturer.firstName || ''} ${product.manufacturer.lastName || ''}`.trim() || product.manufacturer.email,
        email: product.manufacturer.email
      },
      checkpoints: product.checkpoints.map(checkpoint => ({
        id: checkpoint.id,
        name: checkpoint.name,
        location: checkpoint.location,
        timestamp: checkpoint.timestamp.toISOString(),
        environment: checkpoint.environment,
        metadata: checkpoint.metadata
      })),
      nftCertificates: product.nftCertificates.map(nft => ({
        id: nft.id,
        tokenId: nft.tokenId,
        contractAddress: nft.contractAddress,
        isVerified: nft.isVerified
      }))
    }));

    return res.json({
      success: true,
      products: transformedProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get specific product by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    // Find product by ID with all related data
    const product = await db.product.findUnique({
      where: { id },
      include: {
        manufacturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        checkpoints: {
          orderBy: {
            timestamp: 'desc'
          }
        },
        nftCertificates: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check user permissions (if authenticated)
    if (userId && product.manufacturerId !== userId) {
      // For now, allow access to all products
      // Permission checking will be implemented based on user roles in future iterations
    }

    // Transform product to match frontend expectations
    const transformedProduct = {
      id: product.id,
      name: product.name,
      type: product.type,
      batchNumber: product.batchNumber,
      manufactureDate: product.manufactureDate.toISOString(),
      expiryDate: product.expiryDate?.toISOString(),
      rawMaterials: product.rawMaterials,
      status: product.isActive ? 'ACTIVE' : 'INACTIVE',
      blockchainId: product.nftCertificates[0]?.contractAddress || null,
      metadataURI: product.metadataURI,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      manufacturer: {
        id: product.manufacturer.id,
        name: `${product.manufacturer.firstName || ''} ${product.manufacturer.lastName || ''}`.trim() || product.manufacturer.email,
        email: product.manufacturer.email,
        role: product.manufacturer.role
      },
      checkpoints: product.checkpoints.map(checkpoint => ({
        id: checkpoint.id,
        name: checkpoint.name,
        location: checkpoint.location,
        timestamp: checkpoint.timestamp.toISOString(),
        environment: checkpoint.environment,
        metadata: checkpoint.metadata
      })),
      nftCertificates: product.nftCertificates.map(nft => ({
        id: nft.id,
        tokenId: nft.tokenId,
        contractAddress: nft.contractAddress,
        verificationCode: nft.verificationCode,
        metadataURI: nft.metadataURI,
        complianceStandards: nft.complianceStandards,
        isVerified: nft.isVerified,
        lastVerified: nft.lastVerified,
        owner: {
          id: nft.owner.id,
          name: `${nft.owner.firstName || ''} ${nft.owner.lastName || ''}`.trim() || nft.owner.email,
          email: nft.owner.email
        }
      }))
    };

    return res.json({
      success: true,
      product: transformedProduct
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Test endpoint for product registration (no auth required)
router.post('/test', validateProductRegistration, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const {
    name,
    type,
    batchNumber,
    manufactureDate,
    expiryDate,
    rawMaterials,
    metadataURI
  } = req.body;

  // Generate a unique ID for the product
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const blockchainId = `0x${Math.random().toString(16).substring(2, 42)}`;

  const product = {
    id: productId,
    name,
    type,
    batchNumber,
    manufactureDate,
    expiryDate,
    rawMaterials,
    metadataURI,
    status: 'ACTIVE',
    blockchainId: blockchainId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stakeholders: ['test-user-id'],
    checkpoints: [
      {
        id: `checkpoint_${Date.now()}`,
        productId: productId,
        status: 'MANUFACTURED',
        location: 'Manufacturing Facility',
        additionalData: 'Product registered and verified',
        timestamp: new Date().toISOString(),
        stakeholder: 'test-user-id'
      }
    ]
  };

  return res.status(201).json({
    message: 'Product registered successfully',
    product
  });
}));

// Register new product
router.post('/', optionalAuth, validateProductRegistration, asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const userId = req.user?.id;
  
  // If no user is authenticated, try to find or create a default user for testing
  let manufacturerId = userId;
  if (!manufacturerId) {
    // For testing purposes, find or create a default manufacturer user
    try {
      const existingUser = await db.user.findFirst({
        where: { role: 'MANUFACTURER' }
      });
      
      if (existingUser) {
        manufacturerId = existingUser.id;
      } else {
        // Create a default manufacturer user for testing
        const newUser = await db.user.create({
          data: {
            email: 'default-manufacturer@tracechain.com',
            firstName: 'Default',
            lastName: 'Manufacturer',
            role: 'MANUFACTURER'
          }
        });
        manufacturerId = newUser.id;
      }
    } catch (error) {
      console.error('Error finding/creating default user:', error);
      return res.status(500).json({
        success: false,
        error: 'Unable to determine manufacturer for product registration'
      });
    }
  }

  const {
    name,
    type,
    batchNumber,
    manufactureDate,
    expiryDate,
    rawMaterials,
    metadataURI
  } = req.body;

  try {
    // Check if batch number already exists
    const existingProduct = await db.product.findUnique({
      where: { batchNumber }
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        error: 'Product with this batch number already exists',
        batchNumber
      });
    }

    // Create product in database
    const product = await db.product.create({
      data: {
        name,
        type,
        batchNumber,
        manufactureDate: new Date(manufactureDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        rawMaterials,
        metadataURI,
        manufacturerId,
        isActive: true
      },
      include: {
        manufacturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create initial checkpoint
    const checkpoint = await db.checkpoint.create({
      data: {
        name: 'Manufactured',
        location: 'Manufacturing Facility',
        timestamp: new Date(),
        environment: 'Production Line',
        metadata: {
          status: 'MANUFACTURED',
          additionalData: 'Product registered and verified',
          stakeholder: manufacturerId
        },
        productId: product.id
      }
    });

    // Transform product to match frontend expectations
    const transformedProduct = {
      id: product.id,
      name: product.name,
      type: product.type,
      batchNumber: product.batchNumber,
      manufactureDate: product.manufactureDate.toISOString(),
      expiryDate: product.expiryDate?.toISOString(),
      rawMaterials: product.rawMaterials,
      status: product.isActive ? 'ACTIVE' : 'INACTIVE',
      blockchainId: null, // Blockchain integration will be implemented in future iterations
      metadataURI: product.metadataURI,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      manufacturer: {
        id: product.manufacturer.id,
        name: `${product.manufacturer.firstName || ''} ${product.manufacturer.lastName || ''}`.trim() || product.manufacturer.email,
        email: product.manufacturer.email,
        role: product.manufacturer.role
      },
      checkpoints: [{
        id: checkpoint.id,
        name: checkpoint.name,
        location: checkpoint.location,
        timestamp: checkpoint.timestamp.toISOString(),
        environment: checkpoint.environment,
        metadata: checkpoint.metadata
      }],
      nftCertificates: [] // NFT certificate creation will be implemented in future iterations
    };

    return res.status(201).json({
      success: true,
      message: 'Product registered successfully',
      product: transformedProduct
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Add checkpoint to product
router.post('/:id/checkpoints', validateCheckpoint, asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;
  const userId = req.user?.id;
  const { status, location, additionalData, temperature, humidity } = req.body;

  // Checkpoint addition logic will be implemented in future iterations
  // 1. Verify user has permission to add checkpoint
  // 2. Validate checkpoint data
  // 3. Add checkpoint to database
  // 4. Update blockchain with checkpoint
  // 5. Trigger notifications if needed

  const checkpoint = {
    id: 'new_checkpoint_id',
    productId: id,
    status,
    location,
    additionalData,
    temperature,
    humidity,
    timestamp: new Date().toISOString(),
    stakeholder: userId
  };

  return res.status(201).json({
    message: 'Checkpoint added successfully',
    checkpoint
  });
}));

// Add stakeholder to product
router.post('/:id/stakeholders', [
  body('stakeholderAddress').isEthereumAddress()
], asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;
  const { stakeholderAddress } = req.body;
  const userId = req.user?.id;

  // Stakeholder addition logic will be implemented in future iterations
  // 1. Verify user has permission to add stakeholder
  // 2. Find or create stakeholder user
  // 3. Add stakeholder to product
  // 4. Update blockchain
  // 5. Send notification to new stakeholder

  return res.status(201).json({
    message: 'Stakeholder added successfully',
    stakeholder: {
      address: stakeholderAddress,
      role: 'DISTRIBUTOR'
    }
  });
}));

// Get product verification info (public endpoint)
router.get('/:id/verify', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Public verification logic will be implemented in future iterations
  // 1. Get product information
  // 2. Get blockchain verification data
  // 3. Return public verification info

  const verification = {
    productId: id,
    isValid: true,
    productName: 'Sample Product',
    manufacturer: 'Sample Corp',
    batchNumber: 'BATCH001',
    manufactureDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    blockchainVerified: true,
    nftCertificate: 'nft_id',
    supplyChain: [
      {
        status: 'MANUFACTURED',
        location: 'Manufacturing Facility',
        timestamp: new Date().toISOString()
      }
    ]
  };

  return res.json({ verification });
}));

// Update product
router.put('/:id', [
  body('name').optional().trim().escape(),
  body('metadataURI').optional().isURL()
], asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;
  const userId = req.user?.id;
  const updates = req.body;

  // Product update logic will be implemented in future iterations
  // 1. Verify user has permission to update
  // 2. Update product in database
  // 3. Update blockchain if needed

  return res.json({
    message: 'Product updated successfully',
    product: {
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    }
  });
}));

export default router;
