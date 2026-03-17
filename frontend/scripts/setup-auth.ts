import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.$queryRaw`
      SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1
    ` as any[];

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    const adminPassword = await hashPassword('admin123!');
    
    await prisma.$executeRaw`
      INSERT INTO users (
        username, email, password, firstName, lastName, name, role, isActive, 
        createdAt, updatedAt, statusSince
      ) VALUES (
        'admin',
        'admin@kennex.ai',
        ${adminPassword},
        'System',
        'Administrator',
        'System Administrator',
        'ADMIN',
        1,
        datetime('now'),
        datetime('now'),
        datetime('now')
      )
    `;

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@kennex.ai');
    console.log('🔑 Password: admin123!');
    console.log('⚠️  Please change the password after first login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createTestUsers() {
  try {
    // Create supervisor user
    const supervisorPassword = await hashPassword('supervisor123!');
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO users (
        username, email, password, firstName, lastName, name, role, isActive,
        createdAt, updatedAt, statusSince
      ) VALUES (
        'supervisor',
        'supervisor@kennex.ai',
        ${supervisorPassword},
        'John',
        'Supervisor',
        'John Supervisor',
        'SUPERVISOR',
        1,
        datetime('now'),
        datetime('now'),
        datetime('now')
      )
    `;

    // Create agent user
    const agentPassword = await hashPassword('agent123!');
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO users (
        username, email, password, firstName, lastName, name, role, isActive,
        createdAt, updatedAt, statusSince
      ) VALUES (
        'agent',
        'agent@kennex.ai',
        ${agentPassword},
        'Jane',
        'Agent',
        'Jane Agent',
        'AGENT',
        1,
        datetime('now'),
        datetime('now'),
        datetime('now')
      )
    `;

    console.log('✅ Test users created successfully');
    console.log('👤 Supervisor - Email: supervisor@kennex.ai, Password: supervisor123!');
    console.log('👤 Agent - Email: agent@kennex.ai, Password: agent123!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  }
}

async function main() {
  console.log('🚀 Setting up authentication users...');
  
  await createAdminUser();
  await createTestUsers();
  
  console.log('✨ Authentication setup complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });