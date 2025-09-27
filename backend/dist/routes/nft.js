"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
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
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('certificateType').isIn(['authenticity', 'compliance', 'ownership', 'quality'])
        .withMessage('Invalid certificate type'),
    (0, express_validator_1.body)('metadataURI').isURL().withMessage('Valid metadata URI is required'),
    (0, express_validator_1.body)('complianceStandards').isArray().withMessage('Compliance standards must be an array'),
    (0, express_validator_1.body)('expiresAt').optional().isISO8601().withMessage('Invalid expiry date format')
];
// GET /api/nft/certificates - Get all certificates
router.get('/certificates', auth_1.authMiddleware, (0, validation_1.validate)(validation_1.validationGroups.nft.query), validation_1.sanitize, (0, authorization_1.requireResourcePermission)(authorization_1.Resource.NFT, authorization_1.Permission.READ), (0, authorization_1.auditLog)('nft_list', authorization_1.Resource.NFT), async (req, res) => {
    try {
        // In a real implementation, this would query the database
        // For now, return mock data
        return res.json(mockCertificates);
    }
    catch (error) {
        console.error('Error fetching certificates:', error);
        return res.status(500).json({ error: { message: 'Failed to fetch certificates' } });
    }
});
// GET /api/nft/certificates/:tokenId - Get specific certificate
router.get('/certificates/:tokenId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { tokenId } = req.params;
        const certificate = mockCertificates.find(cert => cert.tokenId === tokenId);
        if (!certificate) {
            return res.status(404).json({ error: { message: 'Certificate not found' } });
        }
        return res.json(certificate);
    }
    catch (error) {
        console.error('Error fetching certificate:', error);
        return res.status(500).json({ error: { message: 'Failed to fetch certificate' } });
    }
});
// POST /api/nft/mint - Mint new certificate
router.post('/mint', auth_1.authMiddleware, (0, validation_1.validate)(validation_1.validationGroups.nft.mint), validation_1.sanitize, (0, authorization_1.requireResourcePermission)(authorization_1.Resource.NFT, authorization_1.Permission.MINT), (0, authorization_1.auditLog)('nft_mint', authorization_1.Resource.NFT), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        return res.status(201).json({
            success: true,
            tokenId,
            verificationCode,
            certificate: newCertificate
        });
    }
    catch (error) {
        console.error('Error minting certificate:', error);
        return res.status(500).json({ error: { message: 'Failed to mint certificate' } });
    }
});
// POST /api/nft/verify/:code - Verify certificate by code
router.post('/verify/:code', auth_1.authMiddleware, async (req, res) => {
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
        return res.json({
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
    }
    catch (error) {
        console.error('Error verifying certificate:', error);
        return res.status(500).json({ error: { message: 'Failed to verify certificate' } });
    }
});
// GET /api/nft/certificates/product/:productId - Get certificates by product
router.get('/certificates/product/:productId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { productId } = req.params;
        const productCertificates = mockCertificates.filter(cert => cert.productId === productId);
        return res.json(productCertificates);
    }
    catch (error) {
        console.error('Error fetching product certificates:', error);
        return res.status(500).json({ error: { message: 'Failed to fetch product certificates' } });
    }
});
// PUT /api/nft/certificates/:tokenId/star - Toggle star status
router.put('/certificates/:tokenId/star', auth_1.authMiddleware, async (req, res) => {
    try {
        const { tokenId } = req.params;
        const certificate = mockCertificates.find(cert => cert.tokenId === tokenId);
        if (!certificate) {
            return res.status(404).json({ error: { message: 'Certificate not found' } });
        }
        certificate.isStarred = !certificate.isStarred;
        return res.json({
            success: true,
            isStarred: certificate.isStarred
        });
    }
    catch (error) {
        console.error('Error updating star status:', error);
        return res.status(500).json({ error: { message: 'Failed to update star status' } });
    }
});
// DELETE /api/nft/certificates/:tokenId - Invalidate certificate
router.delete('/certificates/:tokenId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { tokenId } = req.params;
        const certificate = mockCertificates.find(cert => cert.tokenId === tokenId);
        if (!certificate) {
            return res.status(404).json({ error: { message: 'Certificate not found' } });
        }
        // In a real implementation, this would call the smart contract to invalidate
        certificate.isValid = false;
        return res.json({
            success: true,
            message: 'Certificate invalidated successfully'
        });
    }
    catch (error) {
        console.error('Error invalidating certificate:', error);
        return res.status(500).json({ error: { message: 'Failed to invalidate certificate' } });
    }
});
// GET /api/nft/stats - Get certificate statistics
router.get('/stats', auth_1.authMiddleware, async (req, res) => {
    try {
        const totalCertificates = mockCertificates.length;
        const validCertificates = mockCertificates.filter(cert => cert.isValid).length;
        const expiredCertificates = mockCertificates.filter(cert => cert.expiresAt && new Date(cert.expiresAt) < new Date()).length;
        const totalVerifications = mockCertificates.reduce((sum, cert) => sum + cert.verificationCount, 0);
        const typeStats = mockCertificates.reduce((acc, cert) => {
            acc[cert.certificateType] = (acc[cert.certificateType] || 0) + 1;
            return acc;
        }, {});
        return res.json({
            totalCertificates,
            validCertificates,
            expiredCertificates,
            totalVerifications,
            typeStats
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({ error: { message: 'Failed to fetch statistics' } });
    }
});
// Helper function to generate verification code
function generateVerificationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
exports.default = router;
//# sourceMappingURL=nft.js.map