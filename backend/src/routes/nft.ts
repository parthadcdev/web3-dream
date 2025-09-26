import express from 'express';
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { 
  requireResourcePermission, 
  requireOwnership, 
  auditLog,
  UserRole,
  Resource,
  Permission
} from '../middleware/authorization.js';
import { 
  validate, 
  sanitize, 
  validationGroups 
} from '../middleware/validation.js';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    email: string;
  };
}

const router = express.Router();

// Mock data for development
let mockCertificates = [
  {
    tokenId: '1',
    productId: '1',
    productName: 'Aspirin 100mg Tablets',
    productType: 'pharmaceutical',
    batchNumber: 'ASP-2024-001',
    certificateType: 'authenticity',
    verificationCode: 'ABC12345',
    metadataURI: 'https://ipfs.io/ipfs/QmMockHash1',
    isValid: true,
    mintedAt: '2024-01-01T00:00:00Z',
    expiresAt: '2025-01-01T00:00:00Z',
    minter: '0x1234567890123456789012345678901234567890',
    complianceStandards: ['FDA Approved', 'ISO 9001'],
    verificationCount: 15,
    lastVerified: '2024-01-20T10:30:00Z',
    imageUrl: 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=Aspirin+Certificate',
    isStarred: true
  },
  {
    tokenId: '2',
    productId: '2',
    productName: 'iPhone 15 Pro',
    productType: 'electronics',
    batchNumber: 'IPH-2024-002',
    certificateType: 'compliance',
    verificationCode: 'DEF67890',
    metadataURI: 'https://ipfs.io/ipfs/QmMockHash2',
    isValid: true,
    mintedAt: '2024-01-15T00:00:00Z',
    expiresAt: '2026-01-15T00:00:00Z',
    minter: '0x1234567890123456789012345678901234567890',
    complianceStandards: ['FCC Certified', 'CE Marking', 'RoHS Compliant'],
    verificationCount: 8,
    lastVerified: '2024-01-18T14:20:00Z',
    imageUrl: 'https://via.placeholder.com/300x200/2196F3/FFFFFF?text=iPhone+Certificate',
    isStarred: false
  }
];

// Validation middleware
const validateMintRequest = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('certificateType').isIn(['authenticity', 'compliance', 'ownership', 'quality'])
    .withMessage('Invalid certificate type'),
  body('metadataURI').isURL().withMessage('Valid metadata URI is required'),
  body('complianceStandards').isArray().withMessage('Compliance standards must be an array'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiry date format')
];

// GET /api/nft/certificates - Get all certificates
router.get('/certificates', 
  authMiddleware,
  validate(validationGroups.nft.query),
  sanitize,
  requireResourcePermission(Resource.NFT, Permission.READ),
  auditLog('nft_list', Resource.NFT),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    // In a real implementation, this would query the database
    // For now, return mock data
    res.json(mockCertificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: { message: 'Failed to fetch certificates' } });
  }
});

// GET /api/nft/certificates/:tokenId - Get specific certificate
router.get('/certificates/:tokenId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tokenId } = req.params;
    const certificate = mockCertificates.find(cert => cert.tokenId === tokenId);
    
    if (!certificate) {
      return res.status(404).json({ error: { message: 'Certificate not found' } });
    }
    
    res.json(certificate);
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: { message: 'Failed to fetch certificate' } });
  }
});

// POST /api/nft/mint - Mint new certificate
router.post('/mint', 
  authMiddleware, 
  validate(validationGroups.nft.mint),
  sanitize,
  requireResourcePermission(Resource.NFT, Permission.MINT),
  auditLog('nft_mint', Resource.NFT),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { 
          message: 'Validation failed', 
          details: errors.array() 
        } 
      });
    }

    const { productId, certificateType, metadataURI, complianceStandards, expiresAt } = req.body;
    
    // Generate unique token ID and verification code
    const tokenId = (mockCertificates.length + 1).toString();
    const verificationCode = generateVerificationCode();
    
    // Create new certificate
    const newCertificate = {
      tokenId,
      productId,
      productName: `Product ${productId}`, // In real implementation, fetch from products table
      productType: 'unknown',
      batchNumber: `BATCH-${Date.now()}`,
      certificateType,
      verificationCode,
      metadataURI,
      isValid: true,
      mintedAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      minter: req.user?.walletAddress || '0x0000000000000000000000000000000000000000',
      complianceStandards: complianceStandards || [],
      verificationCount: 0,
      lastVerified: '',
      imageUrl: `https://via.placeholder.com/300x200/1976d2/FFFFFF?text=Certificate+${tokenId}`,
      isStarred: false
    };
    
    // Add to mock data
    mockCertificates.push(newCertificate);
    
    // In a real implementation, this would:
    // 1. Deploy or interact with the NFT smart contract
    // 2. Mint the NFT on the blockchain
    // 3. Store the certificate data in the database
    // 4. Upload metadata to IPFS
    
    res.status(201).json({
      success: true,
      tokenId,
      verificationCode,
      certificate: newCertificate
    });
  } catch (error) {
    console.error('Error minting certificate:', error);
    res.status(500).json({ error: { message: 'Failed to mint certificate' } });
  }
});

// POST /api/nft/verify/:code - Verify certificate by code
router.post('/verify/:code', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.params;
    const certificate = mockCertificates.find(cert => cert.verificationCode === code);
    
    if (!certificate) {
      return res.status(404).json({ 
        error: { message: 'Certificate not found' },
        isValid: false
      });
    }
    
    // Check if certificate is valid and not expired
    const isValid = certificate.isValid && 
      (!certificate.expiresAt || new Date(certificate.expiresAt) > new Date());
    
    // Update verification count and last verified
    certificate.verificationCount += 1;
    certificate.lastVerified = new Date().toISOString();
    
    // In a real implementation, this would:
    // 1. Call the smart contract to verify the certificate
    // 2. Record the verification event
    // 3. Update the database
    
    res.json({
      isValid,
      certificate: {
        tokenId: certificate.tokenId,
        productName: certificate.productName,
        certificateType: certificate.certificateType,
        verificationCode: certificate.verificationCode,
        isValid: certificate.isValid,
        expiresAt: certificate.expiresAt,
        complianceStandards: certificate.complianceStandards,
        verificationCount: certificate.verificationCount,
        lastVerified: certificate.lastVerified
      },
      verificationData: {
        timestamp: new Date().toISOString(),
        verifier: req.user?.walletAddress || '0x0000000000000000000000000000000000000000',
        verificationMethod: 'api',
        isValid
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: { message: 'Failed to verify certificate' } });
  }
});

// GET /api/nft/certificates/product/:productId - Get certificates by product
router.get('/certificates/product/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const productCertificates = mockCertificates.filter(cert => cert.productId === productId);
    
    res.json(productCertificates);
  } catch (error) {
    console.error('Error fetching product certificates:', error);
    res.status(500).json({ error: { message: 'Failed to fetch product certificates' } });
  }
});

// PUT /api/nft/certificates/:tokenId/star - Toggle star status
router.put('/certificates/:tokenId/star', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tokenId } = req.params;
    const certificate = mockCertificates.find(cert => cert.tokenId === tokenId);
    
    if (!certificate) {
      return res.status(404).json({ error: { message: 'Certificate not found' } });
    }
    
    certificate.isStarred = !certificate.isStarred;
    
    res.json({
      success: true,
      isStarred: certificate.isStarred
    });
  } catch (error) {
    console.error('Error updating star status:', error);
    res.status(500).json({ error: { message: 'Failed to update star status' } });
  }
});

// DELETE /api/nft/certificates/:tokenId - Invalidate certificate
router.delete('/certificates/:tokenId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tokenId } = req.params;
    const certificate = mockCertificates.find(cert => cert.tokenId === tokenId);
    
    if (!certificate) {
      return res.status(404).json({ error: { message: 'Certificate not found' } });
    }
    
    // In a real implementation, this would call the smart contract to invalidate
    certificate.isValid = false;
    
    res.json({
      success: true,
      message: 'Certificate invalidated successfully'
    });
  } catch (error) {
    console.error('Error invalidating certificate:', error);
    res.status(500).json({ error: { message: 'Failed to invalidate certificate' } });
  }
});

// GET /api/nft/stats - Get certificate statistics
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalCertificates = mockCertificates.length;
    const validCertificates = mockCertificates.filter(cert => cert.isValid).length;
    const expiredCertificates = mockCertificates.filter(cert => 
      cert.expiresAt && new Date(cert.expiresAt) < new Date()
    ).length;
    const totalVerifications = mockCertificates.reduce((sum, cert) => sum + cert.verificationCount, 0);
    
    const typeStats = mockCertificates.reduce((acc, cert) => {
      acc[cert.certificateType] = (acc[cert.certificateType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    res.json({
      totalCertificates,
      validCertificates,
      expiredCertificates,
      totalVerifications,
      typeStats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: { message: 'Failed to fetch statistics' } });
  }
});

// Helper function to generate verification code
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default router;
