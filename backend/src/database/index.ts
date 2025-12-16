import { PrismaClient } from '@prisma/client';
import path from 'path';

// Point to the frontend database since we're using a monorepo setup
const databaseUrl = process.env.DATABASE_URL || `file:${path.resolve(__dirname, '../../../frontend/prisma/dev.db')}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    console.log('Database URL:', databaseUrl);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Database URL:', databaseUrl);
    // Don't exit process, just log the error for now
    console.warn('Continuing without database connection');
  }
};

export { prisma };