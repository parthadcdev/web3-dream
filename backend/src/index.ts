import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import session from 'express-session';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { 
  securityHeaders, 
  corsConfig, 
  generalRateLimit, 
  authRateLimit, 
  apiRateLimit,
  strictRateLimit,
  sanitizeInput,
  sqlInjectionProtection,
  xssProtection,
  requestSizeLimit,
  securityLogger,
  securityResponseHeaders,
  requestTimeout
} from './middleware/security.js';
import { 
  requireResourcePermission, 
  requireRole, 
  auditLog,
  UserRole,
  Resource,
  Permission
} from './middleware/authorization.js';
import productRoutes from './routes/products.js';
import userRoutes from './routes/users.js';
import healthRoutes from './routes/health.js';
import nftRoutes from './routes/nft.js';
import securityRoutes from './routes/security.js';
import { securityMonitoring } from './middleware/security-monitoring.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware stack
app.use(securityHeaders);
app.use(corsConfig);
app.use(securityLogger);
app.use(securityResponseHeaders);
app.use(requestTimeout(30000)); // 30 second timeout
app.use(requestSizeLimit('10mb'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'tracechain-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
}));

// Input sanitization and protection
app.use(sanitizeInput);
app.use(sqlInjectionProtection);
app.use(xssProtection);

// Security monitoring
app.use(securityMonitoring);

// Rate limiting (applied in order of specificity)
app.use('/api/auth', authRateLimit);
app.use('/api/nft/mint', strictRateLimit);
app.use('/api', apiRateLimit);
app.use(generalRateLimit);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route (no auth required)
app.use('/api/health', healthRoutes);

// API routes with proper authentication and authorization
app.use('/api/users', userRoutes);
app.use('/api/products', 
  authMiddleware, 
  requireResourcePermission(Resource.PRODUCT, Permission.READ),
  auditLog('product_access', Resource.PRODUCT),
  productRoutes
);
app.use('/api/nft', 
  authMiddleware, 
  requireResourcePermission(Resource.NFT, Permission.READ),
  auditLog('nft_access', Resource.NFT),
  nftRoutes
);

// Security routes (admin only)
app.use('/api/security', 
  authMiddleware, 
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  securityRoutes
);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TraceChain API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
