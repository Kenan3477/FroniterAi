// Test Setup Configuration
// Global setup for all tests including database, mocks, and test utilities

import { PrismaClient } from '@prisma/client';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';

// Initialize test database instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Database setup utilities
async function setupTestDatabase(): Promise<void> {
  try {
    // Push schema to test database
    const { execSync } = require('child_process');
    execSync('npx prisma db push --force-reset', { 
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
      stdio: 'inherit'
    });

    // Create test data
    await seedTestData();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

async function cleanupTestDatabase(): Promise<void> {
  try {
    // Delete all test data
    const fs = require('fs');
    const path = require('path');
    const testDbPath = path.join(__dirname, '../prisma/test.db');
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (error) {
    console.warn('Could not cleanup test database:', error);
  }
}

async function resetTestDatabase(): Promise<void> {
  try {
    // Delete all records but keep schema
    const tableNames = await prisma.$queryRaw<{name: string}[]>`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';
    `;

    // Disable foreign key constraints temporarily
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF;`;

    // Clear all tables
    for (const { name } of tableNames) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
    }

    // Re-enable foreign key constraints
    await prisma.$executeRaw`PRAGMA foreign_keys = ON;`;

    // Re-seed essential test data
    await seedTestData();
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  }
}

async function seedTestData(): Promise<void> {
  try {
    // Create test users  
    const testUsers = [
      {
        id: 'test-user-1',
        name: 'Test User 1',
        email: 'test1@example.com',
        role: 'AGENT',
        status: 'ACTIVE'
      },
      {
        id: 'test-admin-1', 
        name: 'Test Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      {
        id: 'test-manager-1',
        name: 'Test Manager',
        email: 'manager@example.com', 
        role: 'MANAGER',
        status: 'ACTIVE'
      }
    ];

    for (const user of testUsers) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user
      });
    }

    // Create test campaigns
    const testCampaigns = [
      {
        id: 'test-campaign-1',
        name: 'Test Campaign 1',
        description: 'Test campaign for unit tests',
        diallingMode: 'POWER',
        outboundCli: '+1234567890',
        createdByUserId: 'test-admin-1',
        isActive: true
      },
      {
        id: 'test-campaign-2',
        name: 'Test Campaign 2', 
        description: 'Test campaign for integration tests',
        diallingMode: 'PREDICTIVE',
        outboundCli: '+1987654321',
        createdByUserId: 'test-admin-1',
        isActive: true
      }
    ];

    for (const campaign of testCampaigns) {
      await prisma.campaign.upsert({
        where: { id: campaign.id },
        update: {},
        create: campaign
      });
    }

    // Create test contacts
    const testContacts = [
      {
        id: 'test-contact-1',
        contactId: 'CONT-001',
        listId: 'test-campaign-1',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        status: 'new'
      },
      {
        id: 'test-contact-2',
        contactId: 'CONT-002', 
        listId: 'test-campaign-1',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1987654321',
        email: 'jane.smith@example.com',
        status: 'contacted'
      }
    ];

    for (const contact of testContacts) {
      await prisma.contact.upsert({
        where: { contactId: contact.contactId },
        update: {},
        create: contact
      });
    }

    // Create test calls
    const testCalls = [
      {
        id: 'test-call-1',
        campaignId: 'test-campaign-1',
        status: 'ENDED',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        duration: 300
      },
      {
        id: 'test-call-2',
        campaignId: 'test-campaign-1', 
        status: 'ENDED',
        startTime: new Date('2024-01-01T11:00:00Z'),
        endTime: new Date('2024-01-01T11:03:00Z'),
        duration: 180
      }
    ];

    for (const call of testCalls) {
      await prisma.call.upsert({
        where: { id: call.id },
        update: {},
        create: call
      });
    }

  } catch (error) {
    console.error('Failed to seed test data:', error);
    throw error;
  }
}

// Setup before all tests
beforeAll(async () => {
  await setupTestDatabase();
});

// Cleanup after all tests
afterAll(async () => {
  await cleanupTestDatabase();
  await prisma.$disconnect();
});

// Reset database state between tests
beforeEach(async () => {
  // Clear all tables but keep schema
  await resetTestDatabase();
});

// Export test utilities
export { prisma };

// Global test utilities
global.testUtils = {
  prisma,
  createTestUser: (data: any) => prisma.user.create({ data }),
  createTestCampaign: (data: any) => prisma.campaign.create({ data }),
  createTestContact: (data: any) => prisma.contact.create({ data }),
  createTestCall: (data: any) => prisma.call.create({ data }),
  
  // Authentication helpers
  generateTestToken: (userId: string) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { 
        userId, 
        username: `test-user-${userId}`,
        role: 'ADMIN',
        permissions: ['read', 'write', 'admin']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  // API test helpers
  getAuthHeaders: (userId: string) => ({
    'Authorization': `Bearer ${global.testUtils.generateTestToken(userId)}`,
    'Content-Type': 'application/json'
  }),

  // Data validation helpers
  expectValidId: (id: string) => {
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  },

  expectValidTimestamp: (timestamp: any) => {
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp).getTime()).not.toBeNaN();
  },

  expectValidEmail: (email: string) => {
    expect(email).toBeDefined();
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  },

  // Mock data generators
  generateMockContact: (overrides = {}) => ({
    contactId: `MOCK-${Date.now()}`,
    listId: 'test-campaign-1',
    firstName: 'Mock',
    lastName: 'Contact',
    phone: '+1555123456',
    email: 'mock@example.com',
    status: 'new',
    ...overrides
  }),

  generateMockCall: (overrides = {}) => ({
    campaignId: 'test-campaign-1',
    status: 'ENDED',
    startTime: new Date(),
    duration: 120,
    ...overrides
  })
};

// Extend global types for TypeScript
declare global {
  var testUtils: {
    prisma: PrismaClient;
    createTestUser: (data: any) => Promise<any>;
    createTestCampaign: (data: any) => Promise<any>;
    createTestContact: (data: any) => Promise<any>;
    createTestCall: (data: any) => Promise<any>;
    generateTestToken: (userId: string) => string;
    getAuthHeaders: (userId: string) => Record<string, string>;
    expectValidId: (id: string) => void;
    expectValidTimestamp: (timestamp: any) => void;
    expectValidEmail: (email: string) => void;
    generateMockContact: (overrides?: any) => any;
    generateMockCall: (overrides?: any) => any;
  };
}