"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Validation middleware
const validateUserRegistration = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('companyName').notEmpty().trim().escape(),
    (0, express_validator_1.body)('companyType').isIn(['MANUFACTURER', 'DISTRIBUTOR', 'RETAILER', 'LOGISTICS']),
    (0, express_validator_1.body)('walletAddress').optional().isEthereumAddress()
];
const validateUserLogin = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty()
];
// User registration
router.post('/register', validateUserRegistration, (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const { email, password, companyName, companyType, walletAddress } = req.body;
    // TODO: Implement user registration logic
    // 1. Check if user already exists
    // 2. Hash password
    // 3. Create user in database
    // 4. Generate JWT token
    // 5. Send welcome email
    return res.status(201).json({
        message: 'User registered successfully',
        user: {
            email,
            companyName,
            companyType,
            walletAddress
        }
    });
}));
// User login
router.post('/login', validateUserLogin, (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const { email, password } = req.body;
    // TODO: Implement user login logic
    // 1. Find user by email
    // 2. Verify password
    // 3. Generate JWT token
    // 4. Update last login timestamp
    // For demo purposes, generate a real JWT token
    const secret = process.env.JWT_SECRET || 'tracechain_jwt_secret_key_2025_development';
    const token = jsonwebtoken_1.default.sign({
        id: '1',
        email: email,
        role: 'MANUFACTURER'
    }, secret, { expiresIn: '24h' });
    return res.json({
        message: 'Login successful',
        token: token,
        user: {
            email,
            role: 'MANUFACTURER' // TODO: Get from database
        }
    });
}));
// Web3 wallet authentication
router.post('/wallet-auth', [
    (0, express_validator_1.body)('walletAddress').isEthereumAddress(),
    (0, express_validator_1.body)('signature').notEmpty(),
    (0, express_validator_1.body)('message').notEmpty()
], (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const { walletAddress, signature, message } = req.body;
    // TODO: Implement wallet authentication logic
    // 1. Verify signature
    // 2. Check if wallet is associated with existing user
    // 3. Create user if doesn't exist
    // 4. Generate JWT token
    return res.json({
        message: 'Wallet authentication successful',
        token: 'jwt_token_here', // TODO: Generate actual JWT
        user: {
            walletAddress,
            role: 'MANUFACTURER' // TODO: Get from database
        }
    });
}));
// Get user profile
router.get('/profile', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    // TODO: Get user profile from database
    return res.json({
        user: {
            id: 'user_id',
            email: 'user@example.com',
            companyName: 'Example Corp',
            companyType: 'MANUFACTURER',
            walletAddress: '0x123...',
            role: 'MANUFACTURER',
            createdAt: new Date().toISOString()
        }
    });
}));
// Update user profile
router.put('/profile', [
    (0, express_validator_1.body)('companyName').optional().trim().escape(),
    (0, express_validator_1.body)('walletAddress').optional().isEthereumAddress()
], (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const updates = req.body;
    // TODO: Update user profile in database
    return res.json({
        message: 'Profile updated successfully',
        user: updates
    });
}));
exports.default = router;
//# sourceMappingURL=users.js.map