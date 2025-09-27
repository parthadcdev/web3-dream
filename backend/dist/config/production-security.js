"use strict";
/**
 * Production Security Configuration
 * This file contains security settings for production deployment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProductionSecurityConfig = exports.productionSecurityConfig = void 0;
exports.productionSecurityConfig = {
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || (() => {
            throw new Error('JWT_SECRET must be set in production');
        })(),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'tracechain-api',
        audience: 'tracechain-client'
    },
    // Session Configuration
    session: {
        secret: process.env.SESSION_SECRET || (() => {
            throw new Error('SESSION_SECRET must be set in production');
        })(),
        name: 'tracechain.sid',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            secure: true, // HTTPS only in production
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        }
    },
    // Rate Limiting Configuration
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
        apiMax: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '30'),
        strictMax: parseInt(process.env.STRICT_RATE_LIMIT_MAX_REQUESTS || '10')
    },
    // CORS Configuration
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
            'https://app.tracechain.com',
            'https://verify.tracechain.com',
            'https://admin.tracechain.com'
        ],
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
    },
    // Security Headers Configuration
    securityHeaders: {
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
                    "https://gateway.pinata.cloud"
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
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        frameguard: { action: 'deny' },
        hidePoweredBy: true
    },
    // Database Security
    database: {
        ssl: {
            rejectUnauthorized: true,
            ca: process.env.DATABASE_SSL_CA,
            cert: process.env.DATABASE_SSL_CERT,
            key: process.env.DATABASE_SSL_KEY
        },
        pool: {
            min: 5,
            max: 20,
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200
        },
        queryTimeout: 30000,
        logging: false // Disable query logging in production
    },
    // Encryption Configuration
    encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.ENCRYPTION_KEY || (() => {
            throw new Error('ENCRYPTION_KEY must be set in production');
        })(),
        ivLength: 16,
        tagLength: 16
    },
    // Password Security
    password: {
        minLength: 12, // Increased for production
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        bcryptRounds: 14, // Increased for production
        maxAttempts: 3, // Reduced for production
        lockoutDuration: 30 * 60 * 1000 // 30 minutes
    },
    // Security Features
    features: {
        mfa: process.env.MFA_ENABLED === 'true',
        apiKeys: process.env.API_KEYS_ENABLED === 'true',
        ipWhitelist: process.env.IP_WHITELIST_ENABLED === 'true',
        geoRestrictions: process.env.GEO_RESTRICTIONS_ENABLED === 'true',
        timeRestrictions: process.env.TIME_RESTRICTIONS_ENABLED === 'true'
    },
    // Monitoring Configuration
    monitoring: {
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
        enableAlerts: true,
        alertWebhook: process.env.ALERT_WEBHOOK_URL,
        alertThresholds: {
            errorRate: 0.01, // 1% in production
            responseTime: 2000, // 2 seconds
            memoryUsage: 0.8, // 80%
            cpuUsage: 0.8 // 80%
        }
    },
    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        enableConsole: false, // Disable console logging in production
        enableFile: true,
        logFile: '/var/log/tracechain/app.log',
        maxFileSize: '50m',
        maxFiles: 10,
        enableAuditLog: process.env.ENABLE_AUDIT_LOGGING === 'true',
        auditLogFile: '/var/log/tracechain/audit.log',
        enableSecurityLog: process.env.ENABLE_SECURITY_LOGGING === 'true',
        securityLogFile: '/var/log/tracechain/security.log'
    },
    // File Upload Security
    fileUpload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf'
        ],
        scanUploads: true,
        quarantineSuspiciousFiles: true
    },
    // API Security
    api: {
        timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
        enableCaching: process.env.ENABLE_CACHING === 'true',
        cacheTTL: parseInt(process.env.CACHE_TTL || '300'),
        enableCompression: process.env.ENABLE_COMPRESSION === 'true'
    },
    // IP Whitelisting
    ipWhitelist: {
        enabled: process.env.IP_WHITELIST_ENABLED === 'true',
        allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
        blockedIPs: process.env.BLOCKED_IPS?.split(',') || []
    },
    // Geographic Restrictions
    geoRestrictions: {
        enabled: process.env.GEO_RESTRICTIONS_ENABLED === 'true',
        allowedCountries: process.env.ALLOWED_COUNTRIES?.split(',') || [],
        blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || []
    },
    // Time-based Access Control
    timeRestrictions: {
        enabled: process.env.TIME_RESTRICTIONS_ENABLED === 'true',
        allowedHours: [
            { start: 0, end: 23 } // 24/7 by default
        ],
        timezone: process.env.TIMEZONE || 'UTC'
    }
};
// Validation function for production security config
const validateProductionSecurityConfig = () => {
    const errors = [];
    // Check required environment variables
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
        errors.push('SESSION_SECRET must be at least 32 characters long');
    }
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
        errors.push('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    if (!process.env.DATABASE_URL) {
        errors.push('DATABASE_URL must be set');
    }
    // Check SSL configuration for database
    if (process.env.DATABASE_SSL_CA && !process.env.DATABASE_SSL_CERT) {
        errors.push('DATABASE_SSL_CERT must be set when DATABASE_SSL_CA is provided');
    }
    if (process.env.DATABASE_SSL_CERT && !process.env.DATABASE_SSL_KEY) {
        errors.push('DATABASE_SSL_KEY must be set when DATABASE_SSL_CERT is provided');
    }
    // Check CORS origins
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.split(',').length === 0) {
        errors.push('ALLOWED_ORIGINS must be set with at least one origin');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validateProductionSecurityConfig = validateProductionSecurityConfig;
exports.default = exports.productionSecurityConfig;
//# sourceMappingURL=production-security.js.map