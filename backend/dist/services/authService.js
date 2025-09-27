"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const security_1 = require("../config/security");
const prisma = new client_1.PrismaClient();
class AuthService {
    /**
     * Hash password using bcrypt
     */
    static async hashPassword(password) {
        const saltRounds = security_1.securityConfig.password.bcryptRounds;
        return bcrypt.hash(password, saltRounds);
    }
    /**
     * Verify password against hash
     */
    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    /**
     * Validate password strength
     */
    static validatePasswordStrength(password) {
        const errors = [];
        const config = security_1.securityConfig.password;
        if (password.length < config.minLength) {
            errors.push(`Password must be at least ${config.minLength} characters long`);
        }
        if (password.length > config.maxLength) {
            errors.push(`Password must be no more than ${config.maxLength} characters long`);
        }
        if (config.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (config.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (config.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Generate JWT token
     */
    static generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            walletAddress: user.walletAddress
        };
        return jwt.sign(payload, process.env.JWT_SECRET || 'tracechain_jwt_secret_key_2025_development', { expiresIn: '24h' });
    }
    /**
     * Register a new user
     */
    static async registerUser(data) {
        try {
            // Validate password strength
            const passwordValidation = this.validatePasswordStrength(data.password);
            if (!passwordValidation.isValid) {
                return {
                    success: false,
                    error: `Password validation failed: ${passwordValidation.errors.join(', ')}`
                };
            }
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: data.email }
            });
            if (existingUser) {
                return {
                    success: false,
                    error: 'User with this email already exists'
                };
            }
            // Check if wallet address is already in use (if provided)
            if (data.walletAddress) {
                const existingWallet = await prisma.user.findUnique({
                    where: { walletAddress: data.walletAddress }
                });
                if (existingWallet) {
                    return {
                        success: false,
                        error: 'Wallet address is already associated with another account'
                    };
                }
            }
            // Hash password
            const hashedPassword = await this.hashPassword(data.password);
            // Create user in database
            const user = await prisma.user.create({
                data: {
                    email: data.email,
                    firstName: data.firstName || null,
                    lastName: data.lastName || null,
                    role: data.role || 'USER',
                    walletAddress: data.walletAddress || null,
                    // Note: We're not storing the password in the current schema
                    // This would need to be added to the Prisma schema if we want traditional auth
                }
            });
            // Generate JWT token
            const token = this.generateToken(user);
            return {
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName || undefined,
                    lastName: user.lastName || undefined,
                    role: user.role,
                    walletAddress: user.walletAddress || undefined
                }
            };
        }
        catch (error) {
            console.error('User registration error:', error);
            return {
                success: false,
                error: error.message || 'Registration failed'
            };
        }
    }
    /**
     * Login user with email and password
     * Note: This requires password field to be added to User model
     */
    static async loginUser(credentials) {
        try {
            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email: credentials.email }
            });
            if (!user) {
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }
            // Note: Password verification would require password field in User model
            // For now, we'll return an error indicating this needs to be implemented
            return {
                success: false,
                error: 'Password-based login not yet implemented. Please use Stytch authentication or wallet authentication.'
            };
        }
        catch (error) {
            console.error('User login error:', error);
            return {
                success: false,
                error: error.message || 'Login failed'
            };
        }
    }
    /**
     * Verify JWT token
     */
    static async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tracechain_jwt_secret_key_2025_development');
            // Get fresh user data from database
            const user = await prisma.user.findUnique({
                where: { id: decoded.id }
            });
            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName || undefined,
                    lastName: user.lastName || undefined,
                    role: user.role,
                    walletAddress: user.walletAddress || undefined
                }
            };
        }
        catch (error) {
            console.error('Token verification error:', error);
            return {
                success: false,
                error: error.message || 'Invalid token'
            };
        }
    }
    /**
     * Log security event
     */
    static async logSecurityEvent(eventType, severity, description, metadata, ipAddress, userAgent) {
        try {
            await prisma.securityEvent.create({
                data: {
                    eventType,
                    severity,
                    description,
                    metadata: metadata || {},
                    ipAddress,
                    userAgent
                }
            });
        }
        catch (error) {
            console.error('Failed to log security event:', error);
        }
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=authService.js.map