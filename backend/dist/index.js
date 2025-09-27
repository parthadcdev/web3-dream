"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const database_1 = require("./config/database");
const security_1 = require("./middleware/security");
const authorization_1 = require("./middleware/authorization");
const products_1 = __importDefault(require("./routes/products"));
const users_1 = __importDefault(require("./routes/users"));
const health_1 = __importDefault(require("./routes/health"));
const nft_1 = __importDefault(require("./routes/nft"));
const security_2 = __importDefault(require("./routes/security"));
const database_2 = __importDefault(require("./routes/database"));
const stytch_1 = __importDefault(require("./routes/stytch"));
const security_monitoring_1 = require("./middleware/security-monitoring");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);
// Security middleware stack
app.use(security_1.securityHeaders);
app.use(security_1.corsConfig);
app.use(security_1.securityLogger);
app.use(security_1.securityResponseHeaders);
app.use((0, security_1.requestTimeout)(30000)); // 30 second timeout
app.use((0, security_1.requestSizeLimit)('10mb'));
// Session configuration
app.use((0, express_session_1.default)({
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
app.use(security_1.sanitizeInput);
app.use(security_1.sqlInjectionProtection);
app.use(security_1.xssProtection);
// Security monitoring
app.use(security_monitoring_1.securityMonitoring);
// Rate limiting (applied in order of specificity)
app.use('/api/auth', security_1.authRateLimit);
app.use('/api/nft/mint', security_1.strictRateLimit);
app.use('/api', security_1.apiRateLimit);
app.use(security_1.generalRateLimit);
// Logging
app.use((0, morgan_1.default)('combined'));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check route (no auth required)
app.use('/api/health', health_1.default);
// Database routes (no auth required for health check)
app.use('/api/database', database_2.default);
// Stytch authentication routes (no auth required)
app.use('/api/stytch', stytch_1.default);
// API routes with proper authentication and authorization
app.use('/api/users', users_1.default);
app.use('/api/products', auth_1.authMiddleware, (0, authorization_1.requireResourcePermission)(authorization_1.Resource.PRODUCT, authorization_1.Permission.READ), (0, authorization_1.auditLog)('product_access', authorization_1.Resource.PRODUCT), products_1.default);
app.use('/api/nft', auth_1.authMiddleware, (0, authorization_1.requireResourcePermission)(authorization_1.Resource.NFT, authorization_1.Permission.READ), (0, authorization_1.auditLog)('nft_access', authorization_1.Resource.NFT), nft_1.default);
// Security routes (admin only)
app.use('/api/security', auth_1.authMiddleware, (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN, authorization_1.UserRole.MODERATOR]), security_2.default);
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
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    // Check database connection on startup
    await (0, database_1.checkDatabaseConnection)();
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await (0, database_1.disconnectDatabase)();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await (0, database_1.disconnectDatabase)();
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=index.js.map