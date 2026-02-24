require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function createRailwayAdmin() {
  try {
    console.log('🔧 Creating Railway admin account...\n');

    const email = 'admin@omnivox.ai';
    const username = 'testadmin' + Date.now();
    const password = 'TestAdmin2026!';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Delete existing admin if exists
    try {
      await prisma.user.delete({
        where: { email }
      });
      console.log('🗑️ Removed existing admin account');
    } catch (e) {
      console.log('ℹ️ No existing admin to remove');
    }

    // Create new admin
    const admin = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        status: 'online',
        lastLoginAttempt: null,
        accountLockedUntil: null,
        failedLoginAttempts: 0
      }
    });

    console.log('✅ Railway admin created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 User ID:', admin.id);
    console.log('\n🌐 You can now login at http://localhost:3000');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createRailwayAdmin();