require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function createFreshAdmin() {
  try {
    console.log('🔧 Creating fresh admin account...\n');

    // Hash password
    const hashedPassword = await bcrypt.hash('FreshAdmin123!', 12);
    
    // Delete existing conflicting admin if any
    try {
      await prisma.user.delete({
        where: { email: 'freshadmin@omnivox.com' }
      });
      console.log('🗑️ Removed existing freshadmin account');
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Create new admin
    const admin = await prisma.user.create({
      data: {
        username: 'freshadmin',
        email: 'freshadmin@omnivox.com',
        password: hashedPassword,
        firstName: 'Fresh',
        lastName: 'Admin',
        name: 'Fresh Admin',
        role: 'ADMIN',
        isActive: true,
        status: 'online'
      }
    });

    console.log('✅ Fresh admin created successfully!');
    console.log('📧 Email: freshadmin@omnivox.com');
    console.log('🔑 Password: FreshAdmin123!');
    console.log('👤 User ID:', admin.id);
    console.log('👑 Role:', admin.role);

    // Test login immediately
    console.log('\n🧪 Testing login...');
    const testResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'freshadmin@omnivox.com',
        password: 'FreshAdmin123!'
      })
    });

    const testData = await testResponse.json();
    if (testData.success) {
      console.log('🎉 Login test successful!');
      console.log('🏷️ Token length:', testData.data.token.length);
    } else {
      console.log('❌ Login test failed:', testData.message);
    }

  } catch (error) {
    console.error('❌ Error creating fresh admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createFreshAdmin();