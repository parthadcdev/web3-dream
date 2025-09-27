"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationGroups = exports.customValidators = exports.sanitize = exports.validate = exports.checkpointValidation = exports.nftValidation = exports.userValidation = exports.productValidation = exports.sanitizers = exports.patterns = void 0;
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("./errorHandler");
// Common validation patterns
exports.patterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    walletAddress: /^0x[a-fA-F0-9]{40}$/,
    tokenId: /^[0-9]+$/,
    batchNumber: /^[A-Z0-9-]+$/,
    verificationCode: /^[A-Z0-9]{8}$/,
    ipfsHash: /^Qm[a-zA-Z0-9]{44}$/,
    url: /^https?:\/\/.+/,
    phone: /^\+?[1-9]\d{1,14}$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
    noSpecialChars: /^[a-zA-Z0-9\s\-_.,]+$/
};
// Sanitization functions
exports.sanitizers = {
    trim: (value) => value?.trim(),
    escape: (value) => value?.replace(/[<>]/g, ''),
    normalizeEmail: (value) => value?.toLowerCase().trim(),
    normalizeWallet: (value) => value?.toLowerCase(),
    removeHtml: (value) => value?.replace(/<[^>]*>/g, ''),
    removeScripts: (value) => value?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
    limitLength: (maxLength) => (value) => value?.substring(0, maxLength)
};
// Product validation
exports.productValidation = {
    create: [
        (0, express_validator_1.body)('name')
            .notEmpty()
            .withMessage('Product name is required')
            .isLength({ min: 1, max: 255 })
            .withMessage('Product name must be between 1 and 255 characters')
            .matches(exports.patterns.noSpecialChars)
            .withMessage('Product name contains invalid characters')
            .customSanitizer(exports.sanitizers.trim),
        (0, express_validator_1.body)('type')
            .notEmpty()
            .withMessage('Product type is required')
            .isIn(['PHARMACEUTICAL', 'LUXURY', 'ELECTRONICS', 'FOOD', 'OTHER'])
            .withMessage('Invalid product type'),
        (0, express_validator_1.body)('batchNumber')
            .notEmpty()
            .withMessage('Batch number is required')
            .matches(exports.patterns.batchNumber)
            .withMessage('Invalid batch number format')
            .isLength({ min: 1, max: 50 })
            .withMessage('Batch number must be between 1 and 50 characters'),
        (0, express_validator_1.body)('manufactureDate')
            .notEmpty()
            .withMessage('Manufacture date is required')
            .isISO8601()
            .withMessage('Invalid manufacture date format')
            .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            if (date > now) {
                throw new Error('Manufacture date cannot be in the future');
            }
            return true;
        }),
        (0, express_validator_1.body)('expiryDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid expiry date format')
            .custom((value, { req }) => {
            if (value) {
                const manufactureDate = new Date(req.body.manufactureDate);
                const expiryDate = new Date(value);
                if (expiryDate <= manufactureDate) {
                    throw new Error('Expiry date must be after manufacture date');
                }
            }
            return true;
        }),
        (0, express_validator_1.body)('rawMaterials')
            .isArray({ min: 1 })
            .withMessage('Raw materials must be a non-empty array')
            .custom((value) => {
            if (!Array.isArray(value))
                return false;
            return value.every((material) => typeof material === 'string' &&
                material.length > 0 &&
                material.length <= 255 &&
                exports.patterns.noSpecialChars.test(material));
        })
            .withMessage('Invalid raw materials format'),
        (0, express_validator_1.body)('metadataURI')
            .optional()
            .isURL()
            .withMessage('Invalid metadata URI format')
            .matches(exports.patterns.url)
            .withMessage('Metadata URI must be a valid HTTPS URL'),
        (0, express_validator_1.body)('description')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Description must not exceed 1000 characters')
            .customSanitizer(exports.sanitizers.removeHtml)
    ],
    update: [
        (0, express_validator_1.param)('id')
            .notEmpty()
            .withMessage('Product ID is required')
            .matches(exports.patterns.tokenId)
            .withMessage('Invalid product ID format'),
        (0, express_validator_1.body)('name')
            .optional()
            .isLength({ min: 1, max: 255 })
            .withMessage('Product name must be between 1 and 255 characters')
            .matches(exports.patterns.noSpecialChars)
            .withMessage('Product name contains invalid characters')
            .customSanitizer(exports.sanitizers.trim),
        (0, express_validator_1.body)('type')
            .optional()
            .isIn(['PHARMACEUTICAL', 'LUXURY', 'ELECTRONICS', 'FOOD', 'OTHER'])
            .withMessage('Invalid product type'),
        (0, express_validator_1.body)('status')
            .optional()
            .isIn(['ACTIVE', 'INACTIVE', 'EXPIRED'])
            .withMessage('Invalid status value')
    ],
    query: [
        (0, express_validator_1.query)('page')
            .optional()
            .isInt({ min: 1, max: 1000 })
            .withMessage('Page must be a positive integer between 1 and 1000'),
        (0, express_validator_1.query)('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        (0, express_validator_1.query)('type')
            .optional()
            .isIn(['PHARMACEUTICAL', 'LUXURY', 'ELECTRONICS', 'FOOD', 'OTHER'])
            .withMessage('Invalid product type filter'),
        (0, express_validator_1.query)('status')
            .optional()
            .isIn(['ACTIVE', 'INACTIVE', 'EXPIRED'])
            .withMessage('Invalid status filter'),
        (0, express_validator_1.query)('search')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('Search term must be between 1 and 100 characters')
            .customSanitizer(exports.sanitizers.removeHtml)
    ]
};
// User validation
exports.userValidation = {
    register: [
        (0, express_validator_1.body)('email')
            .notEmpty()
            .withMessage('Email is required')
            .matches(exports.patterns.email)
            .withMessage('Invalid email format')
            .customSanitizer(exports.sanitizers.normalizeEmail),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password is required')
            .isLength({ min: 8, max: 128 })
            .withMessage('Password must be between 8 and 128 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        (0, express_validator_1.body)('walletAddress')
            .optional()
            .matches(exports.patterns.walletAddress)
            .withMessage('Invalid wallet address format')
            .customSanitizer(exports.sanitizers.normalizeWallet),
        (0, express_validator_1.body)('role')
            .optional()
            .isIn(['admin', 'moderator', 'manufacturer', 'distributor', 'retailer', 'consumer', 'auditor', 'viewer'])
            .withMessage('Invalid user role'),
        (0, express_validator_1.body)('firstName')
            .optional()
            .isLength({ min: 1, max: 50 })
            .withMessage('First name must be between 1 and 50 characters')
            .matches(exports.patterns.alphanumericWithSpaces)
            .withMessage('First name contains invalid characters')
            .customSanitizer(exports.sanitizers.trim),
        (0, express_validator_1.body)('lastName')
            .optional()
            .isLength({ min: 1, max: 50 })
            .withMessage('Last name must be between 1 and 50 characters')
            .matches(exports.patterns.alphanumericWithSpaces)
            .withMessage('Last name contains invalid characters')
            .customSanitizer(exports.sanitizers.trim)
    ],
    login: [
        (0, express_validator_1.body)('email')
            .notEmpty()
            .withMessage('Email is required')
            .matches(exports.patterns.email)
            .withMessage('Invalid email format')
            .customSanitizer(exports.sanitizers.normalizeEmail),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password is required')
            .isLength({ min: 1, max: 128 })
            .withMessage('Password is required')
    ],
    update: [
        (0, express_validator_1.param)('id')
            .notEmpty()
            .withMessage('User ID is required')
            .matches(exports.patterns.tokenId)
            .withMessage('Invalid user ID format'),
        (0, express_validator_1.body)('email')
            .optional()
            .matches(exports.patterns.email)
            .withMessage('Invalid email format')
            .customSanitizer(exports.sanitizers.normalizeEmail),
        (0, express_validator_1.body)('walletAddress')
            .optional()
            .matches(exports.patterns.walletAddress)
            .withMessage('Invalid wallet address format')
            .customSanitizer(exports.sanitizers.normalizeWallet),
        (0, express_validator_1.body)('role')
            .optional()
            .isIn(['admin', 'moderator', 'manufacturer', 'distributor', 'retailer', 'consumer', 'auditor', 'viewer'])
            .withMessage('Invalid user role')
    ]
};
// NFT validation
exports.nftValidation = {
    mint: [
        (0, express_validator_1.body)('productId')
            .notEmpty()
            .withMessage('Product ID is required')
            .matches(exports.patterns.tokenId)
            .withMessage('Invalid product ID format'),
        (0, express_validator_1.body)('certificateType')
            .notEmpty()
            .withMessage('Certificate type is required')
            .isIn(['authenticity', 'compliance', 'ownership', 'quality'])
            .withMessage('Invalid certificate type'),
        (0, express_validator_1.body)('metadataURI')
            .notEmpty()
            .withMessage('Metadata URI is required')
            .isURL()
            .withMessage('Invalid metadata URI format')
            .matches(exports.patterns.url)
            .withMessage('Metadata URI must be a valid HTTPS URL'),
        (0, express_validator_1.body)('complianceStandards')
            .optional()
            .isArray()
            .withMessage('Compliance standards must be an array')
            .custom((value) => {
            if (!Array.isArray(value))
                return false;
            return value.every((standard) => typeof standard === 'string' &&
                standard.length > 0 &&
                standard.length <= 100 &&
                exports.patterns.noSpecialChars.test(standard));
        })
            .withMessage('Invalid compliance standards format'),
        (0, express_validator_1.body)('expiresAt')
            .optional()
            .isISO8601()
            .withMessage('Invalid expiry date format')
            .custom((value) => {
            if (value) {
                const expiryDate = new Date(value);
                const now = new Date();
                if (expiryDate <= now) {
                    throw new Error('Expiry date must be in the future');
                }
            }
            return true;
        }),
        (0, express_validator_1.body)('description')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Description must not exceed 1000 characters')
            .customSanitizer(exports.sanitizers.removeHtml)
    ],
    verify: [
        (0, express_validator_1.param)('code')
            .notEmpty()
            .withMessage('Verification code is required')
            .matches(exports.patterns.verificationCode)
            .withMessage('Invalid verification code format'),
        (0, express_validator_1.body)('verificationMethod')
            .optional()
            .isIn(['qr', 'code', 'blockchain', 'api'])
            .withMessage('Invalid verification method'),
        (0, express_validator_1.body)('additionalData')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Additional data must not exceed 500 characters')
            .customSanitizer(exports.sanitizers.removeHtml)
    ],
    query: [
        (0, express_validator_1.query)('page')
            .optional()
            .isInt({ min: 1, max: 1000 })
            .withMessage('Page must be a positive integer between 1 and 1000'),
        (0, express_validator_1.query)('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        (0, express_validator_1.query)('type')
            .optional()
            .isIn(['authenticity', 'compliance', 'ownership', 'quality'])
            .withMessage('Invalid certificate type filter'),
        (0, express_validator_1.query)('status')
            .optional()
            .isIn(['valid', 'invalid', 'expired'])
            .withMessage('Invalid status filter')
    ]
};
// Checkpoint validation
exports.checkpointValidation = {
    create: [
        (0, express_validator_1.param)('productId')
            .notEmpty()
            .withMessage('Product ID is required')
            .matches(exports.patterns.tokenId)
            .withMessage('Invalid product ID format'),
        (0, express_validator_1.body)('status')
            .notEmpty()
            .withMessage('Status is required')
            .isLength({ min: 1, max: 100 })
            .withMessage('Status must be between 1 and 100 characters')
            .matches(exports.patterns.noSpecialChars)
            .withMessage('Status contains invalid characters')
            .customSanitizer(exports.sanitizers.trim),
        (0, express_validator_1.body)('location')
            .notEmpty()
            .withMessage('Location is required')
            .isLength({ min: 1, max: 255 })
            .withMessage('Location must be between 1 and 255 characters')
            .matches(exports.patterns.noSpecialChars)
            .withMessage('Location contains invalid characters')
            .customSanitizer(exports.sanitizers.trim),
        (0, express_validator_1.body)('additionalData')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Additional data must not exceed 1000 characters')
            .customSanitizer(exports.sanitizers.removeHtml),
        (0, express_validator_1.body)('temperature')
            .optional()
            .isNumeric()
            .withMessage('Temperature must be a number')
            .isFloat({ min: -50, max: 100 })
            .withMessage('Temperature must be between -50 and 100 degrees'),
        (0, express_validator_1.body)('humidity')
            .optional()
            .isNumeric()
            .withMessage('Humidity must be a number')
            .isFloat({ min: 0, max: 100 })
            .withMessage('Humidity must be between 0 and 100 percent')
    ]
};
// Generic validation middleware
const validate = (validations) => {
    return async (req, res, next) => {
        try {
            // Run all validations
            await Promise.all(validations.map(validation => validation.run(req)));
            // Check for validation errors
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                const formattedErrors = errors.array().map(error => ({
                    field: 'param' in error ? error.param : 'unknown',
                    message: error.msg,
                    value: 'value' in error ? error.value : undefined,
                    location: 'location' in error ? error.location : 'unknown'
                }));
                res.status(400).json({
                    error: 'Validation failed',
                    message: 'Request contains invalid data',
                    details: formattedErrors
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Validation error:', error);
            next((0, errorHandler_1.createError)('Validation error', 400));
        }
    };
};
exports.validate = validate;
// Sanitization middleware
const sanitize = (req, res, next) => {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }
    next();
};
exports.sanitize = sanitize;
// Recursive object sanitization
const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
        return exports.sanitizers.removeHtml(exports.sanitizers.trim(obj));
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
};
// Custom validators
exports.customValidators = {
    isFutureDate: (value) => {
        const date = new Date(value);
        const now = new Date();
        return date > now;
    },
    isPastDate: (value) => {
        const date = new Date(value);
        const now = new Date();
        return date < now;
    },
    isAfterDate: (value, { req }) => {
        const date = new Date(value);
        const compareDate = new Date(req.body.manufactureDate);
        return date > compareDate;
    },
    isValidWalletAddress: (value) => {
        return exports.patterns.walletAddress.test(value);
    },
    isValidIPFSHash: (value) => {
        return exports.patterns.ipfsHash.test(value);
    },
    isStrongPassword: (value) => {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value);
    }
};
// Export validation groups
exports.validationGroups = {
    product: exports.productValidation,
    user: exports.userValidation,
    nft: exports.nftValidation,
    checkpoint: exports.checkpointValidation
};
//# sourceMappingURL=validation.js.map