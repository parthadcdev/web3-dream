"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityResponseHeaders = exports.requestTimeout = exports.ipWhitelist = exports.validateRequest = exports.csrfProtection = exports.securityLogger = exports.requestSizeLimit = exports.xssProtection = exports.sqlInjectionProtection = exports.sanitizeInput = exports.strictRateLimit = exports.apiRateLimit = exports.authRateLimit = exports.generalRateLimit = exports.createRateLimit = exports.corsConfig = exports.securityHeaders = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("./errorHandler");
// Enhanced security headers configuration
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            connectSrc: [
                "'self'",
                "https://api.polygonscan.com",
                "https://api.etherscan.io",
                "https://ipfs.io",
                "https://gateway.pinata.cloud",
                "wss://localhost:*",
                "ws://localhost:*"
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: 'deny' },
    hidePoweredBy: true
});
// Enhanced CORS configuration
exports.corsConfig = (0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'https://app.tracechain.com',
            'https://verify.tracechain.com',
            'https://admin.tracechain.com'
        ];
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS: Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-CSRF-Token',
        'X-Forwarded-For',
        'X-Real-IP'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // 24 hours
});
// Advanced rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: {
            error: message || 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/api/health' || req.path === '/health';
        },
        keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise IP
            const authReq = req;
            return authReq.user?.id || req.ip || 'unknown';
        },
        handler: (req, res) => {
            console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
            res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil(windowMs / 1000),
                limit: max,
                remaining: 0
            });
        }
    });
};
exports.createRateLimit = createRateLimit;
// Rate limiting configurations
exports.generalRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, // 15 minutes
100, // 100 requests per window
'Too many requests from this IP, please try again later.');
exports.authRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, // 15 minutes
5, // 5 auth attempts per window
'Too many authentication attempts, please try again later.');
exports.apiRateLimit = (0, exports.createRateLimit)(60 * 1000, // 1 minute
30, // 30 requests per minute
'API rate limit exceeded, please slow down your requests.');
exports.strictRateLimit = (0, exports.createRateLimit)(60 * 1000, // 1 minute
10, // 10 requests per minute
'Strict rate limit exceeded, please wait before making more requests.');
// Input validation and sanitization
const sanitizeInput = (req, res, next) => {
    // Recursively sanitize all string inputs
    const sanitizeObject = (obj) => {
        if (typeof obj === 'string') {
            return obj.trim().replace(/[<>]/g, '');
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
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    next();
};
exports.sanitizeInput = sanitizeInput;
// SQL injection protection
const sqlInjectionProtection = (req, res, next) => {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
        /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
        /(UNION\s+SELECT)/gi,
        /(DROP\s+TABLE)/gi,
        /(INSERT\s+INTO)/gi,
        /(DELETE\s+FROM)/gi,
        /(UPDATE\s+SET)/gi,
        /(ALTER\s+TABLE)/gi,
        /(EXEC\s*\()/gi,
        /(SCRIPT\s*\()/gi,
        /(--|\/\*|\*\/)/gi,
        /(xp_cmdshell)/gi,
        /(sp_executesql)/gi
    ];
    const checkForSQLInjection = (obj, path = '') => {
        if (typeof obj === 'string') {
            for (const pattern of sqlPatterns) {
                if (pattern.test(obj)) {
                    console.warn(`SQL injection attempt detected at ${path}: ${obj}`);
                    return true;
                }
            }
        }
        else if (Array.isArray(obj)) {
            return obj.some((item, index) => checkForSQLInjection(item, `${path}[${index}]`));
        }
        else if (obj && typeof obj === 'object') {
            return Object.keys(obj).some(key => checkForSQLInjection(obj[key], path ? `${path}.${key}` : key));
        }
        return false;
    };
    if (checkForSQLInjection(req.body, 'body') ||
        checkForSQLInjection(req.query, 'query') ||
        checkForSQLInjection(req.params, 'params')) {
        res.status(400).json({
            error: 'Invalid input detected',
            message: 'Request contains potentially malicious content'
        });
        return;
    }
    next();
};
exports.sqlInjectionProtection = sqlInjectionProtection;
// XSS protection
const xssProtection = (req, res, next) => {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
        /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
        /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /onclick\s*=/gi,
        /onmouseover\s*=/gi
    ];
    const checkForXSS = (obj, path = '') => {
        if (typeof obj === 'string') {
            for (const pattern of xssPatterns) {
                if (pattern.test(obj)) {
                    console.warn(`XSS attempt detected at ${path}: ${obj}`);
                    return true;
                }
            }
        }
        else if (Array.isArray(obj)) {
            return obj.some((item, index) => checkForXSS(item, `${path}[${index}]`));
        }
        else if (obj && typeof obj === 'object') {
            return Object.keys(obj).some(key => checkForXSS(obj[key], path ? `${path}.${key}` : key));
        }
        return false;
    };
    if (checkForXSS(req.body, 'body') ||
        checkForXSS(req.query, 'query') ||
        checkForXSS(req.params, 'params')) {
        res.status(400).json({
            error: 'Invalid input detected',
            message: 'Request contains potentially malicious content'
        });
        return;
    }
    next();
};
exports.xssProtection = xssProtection;
// Request size limiting
const requestSizeLimit = (maxSize) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxBytes = parseInt(maxSize.replace(/\D/g, '')) * (maxSize.includes('mb') ? 1024 * 1024 : 1024);
        if (contentLength > maxBytes) {
            res.status(413).json({
                error: 'Request too large',
                message: `Request size exceeds ${maxSize} limit`
            });
            return;
        }
        next();
    };
};
exports.requestSizeLimit = requestSizeLimit;
// Security logging middleware
const securityLogger = (req, res, next) => {
    const startTime = Date.now();
    const authReq = req;
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: authReq.user?.id,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0
        };
        // Log security events
        if (res.statusCode >= 400) {
            console.warn('Security Event:', logData);
        }
        else {
            console.log('Request:', logData);
        }
    });
    next();
};
exports.securityLogger = securityLogger;
// CSRF protection
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }
    const token = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;
    if (!token || !sessionToken || token !== sessionToken) {
        res.status(403).json({
            error: 'CSRF token mismatch',
            message: 'Invalid or missing CSRF token'
        });
        return;
    }
    next();
};
exports.csrfProtection = csrfProtection;
// Enhanced validation middleware
const validateRequest = (validations) => {
    return async (req, res, next) => {
        try {
            await Promise.all(validations.map(validation => validation.run(req)));
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array().map(err => ({
                        field: 'param' in err ? err.param : 'unknown',
                        message: err.msg,
                        value: 'value' in err ? err.value : undefined
                    }))
                });
                return;
            }
            next();
        }
        catch (error) {
            next((0, errorHandler_1.createError)('Validation error', 400));
        }
    };
};
exports.validateRequest = validateRequest;
// IP whitelist middleware
const ipWhitelist = (allowedIPs) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
            console.warn(`Blocked request from non-whitelisted IP: ${clientIP}`);
            res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address is not authorized'
            });
            return;
        }
        next();
    };
};
exports.ipWhitelist = ipWhitelist;
// Request timeout middleware
const requestTimeout = (timeoutMs) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: 'Request timeout',
                    message: 'Request took too long to process'
                });
            }
        }, timeoutMs);
        res.on('finish', () => clearTimeout(timeout));
        res.on('close', () => clearTimeout(timeout));
        next();
    };
};
exports.requestTimeout = requestTimeout;
// Security headers for API responses
const securityResponseHeaders = (req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
};
exports.securityResponseHeaders = securityResponseHeaders;
//# sourceMappingURL=security.js.map