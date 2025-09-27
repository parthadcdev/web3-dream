/**
 * Production Security Configuration
 * This file contains security settings for production deployment
 */
export declare const productionSecurityConfig: {
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
        issuer: string;
        audience: string;
    };
    session: {
        secret: string;
        name: string;
        resave: boolean;
        saveUninitialized: boolean;
        rolling: boolean;
        cookie: {
            secure: boolean;
            httpOnly: boolean;
            maxAge: number;
            sameSite: "strict";
        };
    };
    rateLimit: {
        windowMs: number;
        max: number;
        authMax: number;
        apiMax: number;
        strictMax: number;
    };
    cors: {
        origin: string[];
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        maxAge: number;
    };
    securityHeaders: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: string[];
                styleSrc: string[];
                fontSrc: string[];
                imgSrc: string[];
                scriptSrc: string[];
                connectSrc: string[];
                frameSrc: string[];
                objectSrc: string[];
                mediaSrc: string[];
                manifestSrc: string[];
                baseUri: string[];
                formAction: string[];
                upgradeInsecureRequests: never[];
            };
        };
        hsts: {
            maxAge: number;
            includeSubDomains: boolean;
            preload: boolean;
        };
        noSniff: boolean;
        xssFilter: boolean;
        referrerPolicy: {
            policy: string;
        };
        frameguard: {
            action: string;
        };
        hidePoweredBy: boolean;
    };
    database: {
        ssl: {
            rejectUnauthorized: boolean;
            ca: string | undefined;
            cert: string | undefined;
            key: string | undefined;
        };
        pool: {
            min: number;
            max: number;
            acquireTimeoutMillis: number;
            createTimeoutMillis: number;
            destroyTimeoutMillis: number;
            idleTimeoutMillis: number;
            reapIntervalMillis: number;
            createRetryIntervalMillis: number;
        };
        queryTimeout: number;
        logging: boolean;
    };
    encryption: {
        algorithm: string;
        key: string;
        ivLength: number;
        tagLength: number;
    };
    password: {
        minLength: number;
        maxLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        bcryptRounds: number;
        maxAttempts: number;
        lockoutDuration: number;
    };
    features: {
        mfa: boolean;
        apiKeys: boolean;
        ipWhitelist: boolean;
        geoRestrictions: boolean;
        timeRestrictions: boolean;
    };
    monitoring: {
        enableMetrics: boolean;
        metricsPort: number;
        healthCheckInterval: number;
        enableAlerts: boolean;
        alertWebhook: string | undefined;
        alertThresholds: {
            errorRate: number;
            responseTime: number;
            memoryUsage: number;
            cpuUsage: number;
        };
    };
    logging: {
        level: string;
        format: string;
        enableConsole: boolean;
        enableFile: boolean;
        logFile: string;
        maxFileSize: string;
        maxFiles: number;
        enableAuditLog: boolean;
        auditLogFile: string;
        enableSecurityLog: boolean;
        securityLogFile: string;
    };
    fileUpload: {
        maxFileSize: number;
        allowedTypes: string[];
        scanUploads: boolean;
        quarantineSuspiciousFiles: boolean;
    };
    api: {
        timeout: number;
        maxRequestSize: string;
        enableCaching: boolean;
        cacheTTL: number;
        enableCompression: boolean;
    };
    ipWhitelist: {
        enabled: boolean;
        allowedIPs: string[];
        blockedIPs: string[];
    };
    geoRestrictions: {
        enabled: boolean;
        allowedCountries: string[];
        blockedCountries: string[];
    };
    timeRestrictions: {
        enabled: boolean;
        allowedHours: {
            start: number;
            end: number;
        }[];
        timezone: string;
    };
};
export declare const validateProductionSecurityConfig: () => {
    isValid: boolean;
    errors: string[];
};
export default productionSecurityConfig;
//# sourceMappingURL=production-security.d.ts.map