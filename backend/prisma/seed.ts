import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create compliance standards
  const complianceStandards = await Promise.all([
    prisma.complianceStandard.upsert({
      where: { name: 'ISO 22000' },
      update: {},
      create: {
        name: 'ISO 22000',
        description: 'Food Safety Management System',
        version: '2018',
        isActive: true,
      },
    }),
    prisma.complianceStandard.upsert({
      where: { name: 'HACCP' },
      update: {},
      create: {
        name: 'HACCP',
        description: 'Hazard Analysis and Critical Control Points',
        version: '2020',
        isActive: true,
      },
    }),
    prisma.complianceStandard.upsert({
      where: { name: 'Organic Certification' },
      update: {},
      create: {
        name: 'Organic Certification',
        description: 'USDA Organic Standards',
        version: '2023',
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Compliance standards created:', complianceStandards.length);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@tracechain.com' },
    update: {},
    create: {
      email: 'admin@tracechain.com',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: UserRole.ADMIN,
    },
  });

  // Create manufacturer user
  const manufacturerUser = await prisma.user.upsert({
    where: { email: 'manufacturer@tracechain.com' },
    update: {},
    create: {
      email: 'manufacturer@tracechain.com',
      walletAddress: '0x2345678901234567890123456789012345678901',
      role: UserRole.MANUFACTURER,
    },
  });

  // Create distributor user
  const distributorUser = await prisma.user.upsert({
    where: { email: 'distributor@tracechain.com' },
    update: {},
    create: {
      email: 'distributor@tracechain.com',
      walletAddress: '0x3456789012345678901234567890123456789012',
      role: UserRole.DISTRIBUTOR,
    },
  });

  console.log('✅ Users created:', { adminUser, manufacturerUser, distributorUser });

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Organic Coffee Beans',
        type: 'Coffee',
        batchNumber: 'COFFEE-2024-001',
        manufactureDate: new Date('2024-01-15'),
        expiryDate: new Date('2025-01-15'),
        rawMaterials: ['Organic Coffee Beans', 'Water', 'Packaging'],
        metadataURI: 'https://ipfs.io/ipfs/QmSample1',
        manufacturerId: manufacturerUser.id,
        checkpoints: {
          create: [
            {
              name: 'Harvest',
              location: 'Colombia Farm',
              timestamp: new Date('2024-01-10'),
              environment: 'Temperature: 22°C, Humidity: 65%',
              metadata: {
                temperature: 22,
                humidity: 65,
                quality: 'Premium',
              },
            },
            {
              name: 'Processing',
              location: 'Processing Plant',
              timestamp: new Date('2024-01-12'),
              environment: 'Controlled Environment',
              metadata: {
                process: 'Wet Processing',
                duration: '48 hours',
              },
            },
            {
              name: 'Packaging',
              location: 'Packaging Facility',
              timestamp: new Date('2024-01-15'),
              environment: 'Clean Room',
              metadata: {
                packageType: 'Vacuum Sealed',
                weight: '500g',
              },
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Fresh Milk',
        type: 'Dairy',
        batchNumber: 'MILK-2024-002',
        manufactureDate: new Date('2024-01-20'),
        expiryDate: new Date('2024-01-27'),
        rawMaterials: ['Fresh Milk', 'Packaging'],
        metadataURI: 'https://ipfs.io/ipfs/QmSample2',
        manufacturerId: manufacturerUser.id,
        checkpoints: {
          create: [
            {
              name: 'Collection',
              location: 'Dairy Farm',
              timestamp: new Date('2024-01-20'),
              environment: 'Temperature: 4°C',
              metadata: {
                temperature: 4,
                quality: 'Grade A',
              },
            },
            {
              name: 'Pasteurization',
              location: 'Processing Plant',
              timestamp: new Date('2024-01-20'),
              environment: 'Temperature: 72°C',
              metadata: {
                temperature: 72,
                duration: '15 seconds',
              },
            },
          ],
        },
      },
    }),
  ]);

  console.log('✅ Products created:', products.length);

  // Create sample NFT certificates
  const nftCertificates = await Promise.all([
    prisma.nFTCertificate.create({
      data: {
        tokenId: '1',
        contractAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
        verificationCode: 'VERIFY-001',
        metadataURI: 'https://ipfs.io/ipfs/QmNFTCert1',
        complianceStandards: ['ISO 22000', 'HACCP'],
        isVerified: true,
        lastVerified: new Date().toISOString(),
        productId: products[0].id,
        ownerId: manufacturerUser.id,
      },
    }),
    prisma.nFTCertificate.create({
      data: {
        tokenId: '2',
        contractAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
        verificationCode: 'VERIFY-002',
        metadataURI: 'https://ipfs.io/ipfs/QmNFTCert2',
        complianceStandards: ['Organic Certification'],
        isVerified: true,
        lastVerified: new Date().toISOString(),
        productId: products[1].id,
        ownerId: distributorUser.id,
      },
    }),
  ]);

  console.log('✅ NFT certificates created:', nftCertificates.length);

  // Create sample audit logs
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        action: 'CREATE_PRODUCT',
        resource: 'Product',
        details: {
          productId: products[0].id,
          productName: products[0].name,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'TraceChain-API/1.0',
        userId: manufacturerUser.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'MINT_NFT',
        resource: 'NFTCertificate',
        details: {
          tokenId: nftCertificates[0].tokenId,
          contractAddress: nftCertificates[0].contractAddress,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'TraceChain-API/1.0',
        userId: manufacturerUser.id,
      },
    }),
  ]);

  console.log('✅ Audit logs created:', auditLogs.length);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
