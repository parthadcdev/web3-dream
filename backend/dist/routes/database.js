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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const router = express_1.default.Router();
// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const isConnected = await (0, database_1.checkDatabaseConnection)();
        if (isConnected) {
            res.status(200).json({
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
                message: 'Database connection successful'
            });
        }
        else {
            res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
                message: 'Database connection failed'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            database: 'error',
            timestamp: new Date().toISOString(),
            message: 'Database health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Database statistics (admin only)
router.get('/stats', auth_1.authMiddleware, (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const [userCount, productCount, checkpointCount, nftCount, auditLogCount] = await Promise.all([
            database_1.db.user.count(),
            database_1.db.product.count(),
            database_1.db.checkpoint.count(),
            database_1.db.nftCertificate.count(),
            database_1.db.auditLog.count()
        ]);
        res.json({
            users: userCount,
            products: productCount,
            checkpoints: checkpointCount,
            nftCertificates: nftCount,
            auditLogs: auditLogCount,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch database statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Database reset (admin only) - for development
router.post('/reset', auth_1.authMiddleware, (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN]), async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                error: 'Database reset not allowed in production'
            });
        }
        // Delete all data in correct order (respecting foreign key constraints)
        await database_1.db.auditLog.deleteMany();
        await database_1.db.nftCertificate.deleteMany();
        await database_1.db.checkpoint.deleteMany();
        await database_1.db.product.deleteMany();
        await database_1.db.user.deleteMany();
        await database_1.db.complianceStandard.deleteMany();
        await database_1.db.securityEvent.deleteMany();
        await database_1.db.tokenTransaction.deleteMany();
        return res.json({
            message: 'Database reset successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        return res.status(500).json({
            error: 'Failed to reset database',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Database seed (admin only) - for development
router.post('/seed', auth_1.authMiddleware, (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN]), async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                error: 'Database seeding not allowed in production'
            });
        }
        // Import and run seed function
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
        const execAsync = promisify(exec);
        await execAsync('npm run db:seed', { cwd: process.cwd() });
        return res.json({
            message: 'Database seeded successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        return res.status(500).json({
            error: 'Failed to seed database',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=database.js.map