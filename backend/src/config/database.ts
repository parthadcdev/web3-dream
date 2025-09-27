import { PrismaClient } from '@prisma/client';

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// In development, store the client in global variable to prevent multiple instances
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Database connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

// Database utilities
export const db = {
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

export default prisma;
