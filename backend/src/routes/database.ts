import express from 'express';
import { checkDatabaseConnection, db } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { requireRole, UserRole } from '../middleware/authorization';

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Database connection successful'
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        message: 'Database connection failed'
      });
    }
  } catch (error) {
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
router.get('/stats', authMiddleware, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const [
      userCount,
      productCount,
      checkpointCount,
      nftCount,
      auditLogCount
    ] = await Promise.all([
      db.user.count(),
      db.product.count(),
      db.checkpoint.count(),
      db.nftCertificate.count(),
      db.auditLog.count()
    ]);

    res.json({
      users: userCount,
      products: productCount,
      checkpoints: checkpointCount,
      nftCertificates: nftCount,
      auditLogs: auditLogCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch database statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database reset (admin only) - for development
router.post('/reset', authMiddleware, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Database reset not allowed in production'
      });
    }

    // Delete all data in correct order (respecting foreign key constraints)
    await db.auditLog.deleteMany();
    await db.nftCertificate.deleteMany();
    await db.checkpoint.deleteMany();
    await db.product.deleteMany();
    await db.user.deleteMany();
    await db.complianceStandard.deleteMany();
    await db.securityEvent.deleteMany();
    await db.tokenTransaction.deleteMany();

    return res.json({
      message: 'Database reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to reset database',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database seed (admin only) - for development
router.post('/seed', authMiddleware, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Database seeding not allowed in production'
      });
    }

    // Import and run seed function
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('npm run db:seed', { cwd: process.cwd() });

    return res.json({
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to seed database',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
