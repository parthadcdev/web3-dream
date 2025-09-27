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
exports.validateSecurityConfig = exports.securityConfig = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
exports.securityConfig = {
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'tracechain-api',
        audience: process.env.JWT_AUDIENCE || 'tracechain-client'
    },
    // Session Configuration
    session: {
        secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
        name: 'tracechain.sid',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        }
    },
    // Rate Limiting Configuration
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/api/health' || req.path === '/health';
        }
    },
    // CORS Configuration
    cors: {
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
    },
    // Database Security
    database: {
        // Connection string with security parameters
        connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/tracechain',
        // SSL configuration for production
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: true,
            ca: process.env.DATABASE_SSL_CA,
            cert: process.env.DATABASE_SSL_CERT,
            key: process.env.DATABASE_SSL_KEY
        } : false,
        // Connection pool settings
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200
        },
        // Query timeout
        queryTimeout: 30000,
        // Enable query logging in development
        logging: process.env.NODE_ENV === 'development'
    },
    // Encryption Configuration
    encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here',
        ivLength: 16,
        tagLength: 16
    },
    // Password Security
    password: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        bcryptRounds: 12,
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
    },
    // API Security
    api: {
        version: 'v1',
        prefix: '/api',
        timeout: 30000,
        maxRequestSize: '10mb',
        enableCaching: true,
        cacheTTL: 300, // 5 minutes
        enableCompression: true,
        enableCORS: true
    },
    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        enableConsole: true,
        enableFile: process.env.NODE_ENV === 'production',
        logFile: process.env.LOG_FILE || 'logs/app.log',
        maxFileSize: '10m',
        maxFiles: 5,
        enableAuditLog: true,
        auditLogFile: 'logs/audit.log'
    },
    // Monitoring and Alerting
    monitoring: {
        enableMetrics: true,
        metricsPort: process.env.METRICS_PORT || 9090,
        healthCheckInterval: 30000, // 30 seconds
        enableAlerts: process.env.NODE_ENV === 'production',
        alertWebhook: process.env.ALERT_WEBHOOK_URL,
        alertThresholds: {
            errorRate: 0.05, // 5%
            responseTime: 5000, // 5 seconds
            memoryUsage: 0.8, // 80%
            cpuUsage: 0.8 // 80%
        }
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
    },
    // MFA Configuration
    mfa: {
        enabled: process.env.MFA_ENABLED === 'true',
        issuer: 'TraceChain',
        algorithm: 'sha1',
        digits: 6,
        period: 30,
        window: 1
    },
    // API Key Configuration
    apiKeys: {
        enabled: process.env.API_KEYS_ENABLED === 'true',
        requiredForPublicEndpoints: false,
        rotationPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
        maxKeysPerUser: 5
    },
    // Content Security
    contentSecurity: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        scanUploads: true,
        quarantineSuspiciousFiles: true
    },
    // Blockchain Security
    blockchain: {
        networks: {
            polygon: {
                rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
                chainId: 137,
                gasPrice: '20000000000', // 20 gwei
                gasLimit: 500000
            },
            mumbai: {
                rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
                chainId: 80001,
                gasPrice: '20000000000', // 20 gwei
                gasLimit: 500000
            }
        },
        privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
        contractAddresses: {
            productRegistry: process.env.PRODUCT_REGISTRY_ADDRESS,
            nftCertificate: process.env.NFT_CERTIFICATE_ADDRESS,
            traceToken: process.env.TRACE_TOKEN_ADDRESS
        }
    },
    // Environment-specific overrides
    development: {
        enableDebugLogs: true,
        disableRateLimiting: false,
        allowInsecureConnections: true,
        enableHotReload: true
    },
    production: {
        enableDebugLogs: false,
        disableRateLimiting: false,
        allowInsecureConnections: false,
        enableHotReload: false,
        enableCompression: true,
        enableCaching: true
    }
};
// Validation function to check if all required environment variables are set
const validateSecurityConfig = () => {
    const errors = [];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
        errors.push('JWT_SECRET must be set to a secure value');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-super-secret-session-key-change-in-production') {
        errors.push('SESSION_SECRET must be set to a secure value');
    }
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.DATABASE_URL) {
            errors.push('DATABASE_URL must be set in production');
        }
        if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === 'your-32-character-encryption-key-here') {
            errors.push('ENCRYPTION_KEY must be set to a secure value in production');
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validateSecurityConfig = validateSecurityConfig;
exports.default = exports.securityConfig;
//# sourceMappingURL=security.js.map