/**
 * Script to create test users for User Management testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🔧 Creating test users...');
    
    // Check if users already exist
    const existingUsers = await prisma.user.findMany();
    console.log(`📊 Current users in database: ${existingUsers.length}`);
    
    if (existingUsers.length > 0) {
      console.log('📋 Existing users:');
      existingUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
      });
    }
    
    // Create test users if needed
    const testUsers = [
      {
        username: 'admin1',
        email: 'admin1@omnivox.test',
        password: await bcrypt.hash('password123', 12),
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true
      },
      {
        username: 'manager1',
        email: 'manager1@omnivox.test',
        password: await bcrypt.hash('password123', 12),
        firstName: 'Manager',
        lastName: 'User',
        name: 'Manager User',
        role: 'MANAGER',
        isActive: true
      },
      {
        username: 'agent1',
        email: 'agent1@omnivox.test',
        password: await bcrypt.hash('password123', 12),
        firstName: 'Agent',
        lastName: 'User',
        name: 'Agent User',
        role: 'AGENT',
        isActive: true
      }
    ];
    
    for (const userData of testUsers) {
      const existingUser = await prisma.user.findFirst({
        where: { email: userData.email }
      });
      
      if (!existingUser) {
        const user = await prisma.user.create({ data: userData });
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      } else {
        console.log(`⚠️ User already exists: ${userData.email}`);
      }
    }
    
    // Final count
    const finalUsers = await prisma.user.findMany();
    console.log(`📊 Final user count: ${finalUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();