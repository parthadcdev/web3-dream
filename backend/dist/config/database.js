"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.disconnectDatabase = exports.checkDatabaseConnection = void 0;
const client_1 = require("@prisma/client");
// Create Prisma client instance
const prisma = globalThis.__prisma || new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
});
// In development, store the client in global variable to prevent multiple instances
if (process.env.NODE_ENV === 'development') {
    globalThis.__prisma = prisma;
}
// Database connection health check
const checkDatabaseConnection = async () => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        console.log('✅ Database connection successful');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
// Graceful shutdown
const disconnectDatabase = async () => {
    try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected gracefully');
    }
    catch (error) {
        console.error('❌ Error disconnecting from database:', error);
    }
};
exports.disconnectDatabase = disconnectDatabase;
// Database utilities
exports.db = {
    // User operations
    user: prisma.user,
    // Product operations
    product: prisma.product,
    checkpoint: prisma.checkpoint,
    // NFT operations
    nftCertificate: prisma.nFTCertificate,
    // Audit operations
    auditLog: prisma.auditLog,
    securityEvent: prisma.securityEvent,
    // Token operations
    tokenTransaction: prisma.tokenTransaction,
    // Compliance operations
    complianceStandard: prisma.complianceStandard,
    // Raw queries
    $queryRaw: prisma.$queryRaw,
    $executeRaw: prisma.$executeRaw,
    // Transactions
    $transaction: prisma.$transaction,
    // Connection management
    $connect: prisma.$connect,
    $disconnect: prisma.$disconnect,
};
exports.default = prisma;
//# sourceMappingURL=database.js.map