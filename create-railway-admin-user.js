/**
 * Create a new admin user on Railway database
 * This script hashes the password locally, but we'll also provide a Railway API method
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function createRailwayAdmin() {
  console.log('🔧 Creating New Admin User on Railway\n');

  const newAdmin = {
    email: 'railway-admin@kennex.ai',
    password: 'RailwayAdmin2026!',
    username: 'railwayadmin',
    firstName: 'Railway',
    lastName: 'Admin',
    name: 'Railway Admin'
  };

  console.log('📋 New Admin Details:');
  console.log(`   Email: ${newAdmin.email}`);
  console.log(`   Password: ${newAdmin.password}`);
  console.log(`   Username: ${newAdmin.username}\n`);

  try {
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: newAdmin.email },
          { username: newAdmin.username }
        ]
      }
    });

    if (existing) {
      console.log('⚠️  User already exists, updating password...');
      
      const hashedPassword = await bcrypt.hash(newAdmin.password, 12);
      
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          isActive: true,
          role: 'ADMIN',
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });

      console.log('✅ User updated successfully!\n');
    } else {
      console.log('➕ Creating new user...');
      
      const hashedPassword = await bcrypt.hash(newAdmin.password, 12);
      
      await prisma.user.create({
        data: {
          email: newAdmin.email,
          username: newAdmin.username,
          password: hashedPassword,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          name: newAdmin.name,
          role: 'ADMIN',
          isActive: true
        }
      });

      console.log('✅ User created successfully!\n');
    }

    console.log('⚠️  WARNING: Password hashed locally - may not work on Railway due to bcrypt issue.');
    console.log('If login fails, use the Railway API method below.\n');

    // Now try to login with the Railway API
    console.log('🧪 Testing login on Railway API...\n');
    
    const response = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newAdmin.email,
        password: newAdmin.password
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('🎉 SUCCESS! User can login to Railway!\n');
      const token = data.data?.token || data.token;
      console.log('🎫 Token:', token?.substring(0, 50) + '...\n');
      
      console.log('✅ You can now use these credentials:');
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Password: ${newAdmin.password}\n`);
      
      return { success: true, credentials: newAdmin, token };
    } else {
      console.log('❌ Login failed on Railway (bcrypt issue)\n');
      console.log('Response:', data);
      console.log('\n💡 Use the Railway API method instead (see below).\n');
      return { success: false, credentials: newAdmin };
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Alternative method: Use Railway API to create user (password hashed ON Railway)
async function createViaRailwayAPI() {
  console.log('\n' + '='.repeat(60));
  console.log('ALTERNATIVE METHOD: Create Admin via Railway API');
  console.log('='.repeat(60) + '\n');

  console.log('Since the emergency endpoints are blocked, you need to:');
  console.log('\n1️⃣  Deploy a password reset endpoint to Railway');
  console.log('2️⃣  Or use Railway shell access\n');

  console.log('📝 Manual Railway Shell Method:');
  console.log('─'.repeat(60));
  console.log('If you have Railway CLI or shell access, run this:\n');
  
  console.log('```bash');
  console.log('railway run -- node -e "');
  console.log("  const { PrismaClient } = require('@prisma/client');");
  console.log("  const bcrypt = require('bcryptjs');");
  console.log('  (async () => {');
  console.log('    const prisma = new PrismaClient();');
  console.log("    const hash = await bcrypt.hash('RailwayAdmin2026!', 12);");
  console.log('    const user = await prisma.user.create({');
  console.log('      data: {');
  console.log("        email: 'railway-admin@kennex.ai',");
  console.log("        username: 'railwayadmin',");
  console.log('        password: hash,');
  console.log("        firstName: 'Railway',");
  console.log("        lastName: 'Admin',");
  console.log("        name: 'Railway Admin',");
  console.log("        role: 'ADMIN',");
  console.log('        isActive: true');
  console.log('      }');
  console.log('    });');
  console.log('    console.log(\"User created:\", user.email);');
  console.log('    await prisma.$disconnect();');
  console.log('  })();');
  console.log('"');
  console.log('```\n');

  console.log('OR use Railway dashboard:');
  console.log('1. Go to: https://railway.app/project/[your-project-id]');
  console.log('2. Open your backend service');
  console.log('3. Click "Shell" tab');
  console.log('4. Run the node command above\n');
}

// Run both methods
createRailwayAdmin()
  .then(result => {
    if (!result.success) {
      createViaRailwayAPI();
    }
  })
  .catch(error => {
    console.error('\n❌ Failed:', error.message);
    createViaRailwayAPI();
  });
