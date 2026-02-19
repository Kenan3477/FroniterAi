// Create an admin user for testing the reports
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:xqLrCjYVBhBPUTcZGRkCeYfhcbBzaHaQ@autorack.proxy.rlwy.net:46886/railway"
});

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@omnivox.ai' },
          { username: 'admin' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@omnivox.ai',
        name: 'System Administrator',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
        refreshTokenVersion: 1,
        failedLoginAttempts: 0
      }
    });

    console.log('✅ Created admin user:', adminUser.email);
    console.log('📋 Credentials - Username: admin, Password: admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();