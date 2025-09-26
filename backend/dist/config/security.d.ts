export declare const securityConfig: {
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
        message: string;
        standardHeaders: boolean;
        legacyHeaders: boolean;
        skip: (req: any) => boolean;
    };
    cors: {
        origin: (origin: string | undefined, callback: Function) => any;
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
        crossOriginEmbedderPolicy: boolean;
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
        connectionString: string;
        ssl: boolean | {
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
    api: {
        version: string;
        prefix: string;
        timeout: number;
        maxRequestSize: string;
        enableCaching: boolean;
        cacheTTL: number;
        enableCompression: boolean;
        enableCORS: boolean;
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
    };
    monitoring: {
        enableMetrics: boolean;
        metricsPort: string | number;
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
    mfa: {
        enabled: boolean;
        issuer: string;
        algorithm: string;
        digits: number;
        period: number;
        window: number;
    };
    apiKeys: {
        enabled: boolean;
        requiredForPublicEndpoints: boolean;
        rotationPeriod: number;
        maxKeysPerUser: number;
    };
    contentSecurity: {
        maxFileSize: number;
        allowedFileTypes: string[];
        scanUploads: boolean;
        quarantineSuspiciousFiles: boolean;
    };
    blockchain: {
        networks: {
            polygon: {
                rpcUrl: string;
                chainId: number;
                gasPrice: string;
                gasLimit: number;
            };
            mumbai: {
                rpcUrl: string;
                chainId: number;
                gasPrice: string;
                gasLimit: number;
            };
        };
        privateKey: string | undefined;
        contractAddresses: {
            productRegistry: string | undefined;
            nftCertificate: string | undefined;
            traceToken: string | undefined;
        };
    };
    development: {
        enableDebugLogs: boolean;
        disableRateLimiting: boolean;
        allowInsecureConnections: boolean;
        enableHotReload: boolean;
    };
    production: {
        enableDebugLogs: boolean;
        disableRateLimiting: boolean;
        allowInsecureConnections: boolean;
        enableHotReload: boolean;
        enableCompression: boolean;
        enableCaching: boolean;
    };
};
export declare const validateSecurityConfig: () => {
    isValid: boolean;
    errors: string[];
};
export default securityConfig;
//# sourceMappingURL=security.d.ts.map