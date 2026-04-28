import { PrismaClient } from '@prisma/client';
import path from 'path';

// Database URL with Railway PostgreSQL as primary, SQLite as fallback
const databaseUrl = process.env.DATABASE_URL || `file:${path.resolve(__dirname, '../../../frontend/prisma/dev.db')}`;
const isPostgreSQL = databaseUrl.startsWith('postgresql://');

console.log('🔧 Database Configuration:', {
  url: databaseUrl.replace(/:[^:@]+@/, ':***@'), // Hide password in logs
  type: isPostgreSQL ? 'PostgreSQL' : 'SQLite',
  environment: process.env.NODE_ENV || 'development'
});

// Connection pooling configuration for Railway PostgreSQL
// 🚨 INCREASED: Railway was exhausting 5 connections with parallel queries
// Interaction history makes 50+ parallel findBetterContact queries
const connectionLimit = isPostgreSQL ? 20 : undefined; // Increased from 5 to 20
const poolTimeout = isPostgreSQL ? 30 : undefined; // Increased from 10s to 30s

// Append connection pool settings to PostgreSQL URL
let finalDatabaseUrl = databaseUrl;
if (isPostgreSQL && !databaseUrl.includes('connection_limit')) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  finalDatabaseUrl = `${databaseUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  console.log('🔧 PostgreSQL connection pooling enabled:', {
    connectionLimit,
    poolTimeout: `${poolTimeout}s`
  });
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: finalDatabaseUrl
    }
  },
  log: ['error', 'warn'],
  errorFormat: 'pretty'
});

export const connectDatabase = async () => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log(`🔄 Attempting database connection... (${4 - retries}/3)`);
      
      await prisma.$connect();
      
      // Test the connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      
      console.log('✅ Database connected successfully');
      console.log(`📊 Connection type: ${isPostgreSQL ? 'PostgreSQL (Railway)' : 'SQLite (Local)'}`);
      
      if (isPostgreSQL) {
        console.log('🎯 Ready to stream real Twilio recordings from database');
      }
      
      return;
      
    } catch (error) {
      retries--;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Database connection attempt failed (${4 - retries}/3):`, errorMessage);
      
      if (retries > 0) {
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('💥 All database connection attempts failed');
        
        if (isPostgreSQL) {
          console.error('🔧 PostgreSQL connection failed. This may cause recording streaming issues.');
          console.error('🎯 Check Railway PostgreSQL service status and environment variables.');
        }
        
        // Don't exit process, let app continue with limited functionality
        console.warn('⚠️ Continuing without stable database connection');
      }
    }
  }
};

// Add graceful shutdown handling
process.on('beforeExit', async () => {
  console.log('🔄 Gracefully disconnecting database...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
});

process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, disconnecting database...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, disconnecting database...');
  await prisma.$disconnect();
  process.exit(0);
});

// Database health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('❌ Database health check failed:', errorMessage);
    return false;
  }
};

export { prisma };