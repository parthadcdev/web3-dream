"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("../middleware/errorHandler");
const authService_1 = require("../services/authService");
const router = (0, express_1.Router)();
// Validation middleware
const validateUserRegistration = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('firstName').optional().trim().escape(),
    (0, express_validator_1.body)('lastName').optional().trim().escape(),
    (0, express_validator_1.body)('role').optional().isIn(['USER', 'MANUFACTURER', 'DISTRIBUTOR', 'RETAILER', 'ADMIN']),
    (0, express_validator_1.body)('walletAddress').optional().isEthereumAddress().withMessage('Valid Ethereum address required'),
    // Legacy fields for backward compatibility
    (0, express_validator_1.body)('companyName').optional().trim().escape(),
    (0, express_validator_1.body)('companyType').optional().isIn(['MANUFACTURER', 'DISTRIBUTOR', 'RETAILER', 'LOGISTICS'])
];
const validateUserLogin = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty()
];
// User registration
router.post('/register', validateUserRegistration, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const { email, password, firstName, lastName, role, walletAddress } = req.body;
    // Log registration attempt
    await authService_1.AuthService.logSecurityEvent('user_registration_attempt', 'info', `Registration attempt for email: ${email}`, { email, hasWalletAddress: !!walletAddress }, req.ip, req.get('User-Agent'));
    // Register user using AuthService
    const result = await authService_1.AuthService.registerUser({
        email,
        password,
        firstName,
        lastName,
        role,
        walletAddress
    });
    if (result.success) {
        // Log successful registration
        await authService_1.AuthService.logSecurityEvent('user_registration_success', 'info', `User registered successfully: ${email}`, { userId: result.user?.id, email }, req.ip, req.get('User-Agent'));
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token: result.token,
            user: result.user
        });
    }
    else {
        // Log failed registration
        await authService_1.AuthService.logSecurityEvent('user_registration_failure', 'warning', `Registration failed for email: ${email}`, { email, error: result.error }, req.ip, req.get('User-Agent'));
        return res.status(400).json({
            success: false,
            error: result.error
        });
    }
}));
// User login
router.post('/login', validateUserLogin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const { email, password } = req.body;
    // Log login attempt
    await authService_1.AuthService.logSecurityEvent('user_login_attempt', 'info', `Login attempt for email: ${email}`, { email }, req.ip, req.get('User-Agent'));
    // Use AuthService for login
    const result = await authService_1.AuthService.loginUser({ email, password });
    if (result.success) {
        // Log successful login
        await authService_1.AuthService.logSecurityEvent('user_login_success', 'info', `User logged in successfully: ${email}`, { userId: result.user?.id, email }, req.ip, req.get('User-Agent'));
        return res.json({
            success: true,
            message: 'Login successful',
            token: result.token,
            user: result.user
        });
    }
    else {
        // Log failed login
        await authService_1.AuthService.logSecurityEvent('user_login_failure', 'warning', `Login failed for email: ${email}`, { email, error: result.error }, req.ip, req.get('User-Agent'));
        return res.status(401).json({
            success: false,
            error: result.error
        });
    }
}));
// Web3 wallet authentication
router.post('/wallet-auth', [
    (0, express_validator_1.body)('walletAddress').isEthereumAddress(),
    (0, express_validator_1.body)('signature').notEmpty(),
    (0, express_validator_1.body)('message').notEmpty()
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
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