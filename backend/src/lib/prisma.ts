/**
 * Centralized Prisma Client Singleton
 * 
 * CRITICAL: This file ensures only ONE PrismaClient instance exists across the entire application.
 * This prevents database connection pool exhaustion.
 * 
 * Usage: import { prisma } from './lib/prisma';
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern for PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Connection pooling settings
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔌 Closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔌 Closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
