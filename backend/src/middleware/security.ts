import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult, ValidationChain } from 'express-validator';
import { createError } from './errorHandler.js';
import { AuthRequest } from './auth.js';

// Enhanced security headers configuration
export const securityHeaders = helmet({
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
export const corsConfig = cors({
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
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
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
      const authReq = req as AuthRequest;
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

// Rate limiting configurations
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
);

export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 auth attempts per window
  'Too many authentication attempts, please try again later.'
);

export const apiRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 requests per minute
  'API rate limit exceeded, please slow down your requests.'
);

export const strictRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 requests per minute
  'Strict rate limit exceeded, please wait before making more requests.'
);

// Input validation and sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Recursively sanitize all string inputs
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
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

// SQL injection protection
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction): void => {
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

  const checkForSQLInjection = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(obj)) {
          console.warn(`SQL injection attempt detected at ${path}: ${obj}`);
          return true;
        }
      }
    } else if (Array.isArray(obj)) {
      return obj.some((item, index) => checkForSQLInjection(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      return Object.keys(obj).some(key => 
        checkForSQLInjection(obj[key], path ? `${path}.${key}` : key)
      );
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

// XSS protection
export const xssProtection = (req: Request, res: Response, next: NextFunction): void => {
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

  const checkForXSS = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          console.warn(`XSS attempt detected at ${path}: ${obj}`);
          return true;
        }
      }
    } else if (Array.isArray(obj)) {
      return obj.some((item, index) => checkForXSS(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      return Object.keys(obj).some(key => 
        checkForXSS(obj[key], path ? `${path}.${key}` : key)
      );
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

// Request size limiting
export const requestSizeLimit = (maxSize: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const authReq = req as AuthRequest;
  
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
    } else {
      console.log('Request:', logData);
    }
  });

  next();
};

// CSRF protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = (req as any).session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    res.status(403).json({
      error: 'CSRF token mismatch',
      message: 'Invalid or missing CSRF token'
    });
    return;
  }

  next();
};

// Enhanced validation middleware
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.all(validations.map(validation => validation.run(req)));
      
      const errors = validationResult(req);
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
    } catch (error) {
      next(createError('Validation error', 400));
    }
  };
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

// Request timeout middleware
export const requestTimeout = (timeoutMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

// Security headers for API responses
export const securityResponseHeaders = (req: Request, res: Response, next: NextFunction): void => {
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
