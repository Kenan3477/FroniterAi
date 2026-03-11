/**
 * Check Railway database users and reset admin password
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminAndVerify() {
  console.log('🔍 Checking Railway Database Users...\n');

  try {
    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${admins.length} admin users:\n`);
    admins.forEach((admin, i) => {
      console.log(`${i + 1}. ${admin.email}`);
      console.log(`   User ID: ${admin.id}`);
      console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log('');
    });

    if (admins.length === 0) {
      console.log('❌ No admin users found! Creating new admin...\n');
      
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@omnivox.ai',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Admin',
          role: 'ADMIN',
          isActive: true
        }
      });

      console.log('✅ Created new admin user:');
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Password: Admin123!`);
      console.log(`   User ID: ${newAdmin.id}`);
      
      return { email: 'admin@omnivox.ai', password: 'Admin123!' };
    }

    // Reset password for first admin user
    const adminToReset = admins[0];
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: adminToReset.id },
      data: { 
        password: hashedPassword,
        isActive: true 
      }
    });

    console.log(`✅ Reset password for: ${adminToReset.email}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   User ID: ${adminToReset.id}\n`);

    // Verify the hash works
    const user = await prisma.user.findUnique({
      where: { id: adminToReset.id }
    });

    const passwordMatch = await bcrypt.compare(newPassword, user.password);
    console.log(`🔐 Password verification: ${passwordMatch ? '✅ PASS' : '❌ FAIL'}`);

    if (!passwordMatch) {
      console.log('❌ WARNING: Password hash verification failed!');
      console.log('This suggests bcrypt issue on Railway environment.');
    }

    return { email: adminToReset.email, password: newPassword };

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetAdminAndVerify()
  .then(credentials => {
    console.log('\n✅ Admin credentials ready:');
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Password: ${credentials.password}`);
    console.log('\nYou can now use these credentials to login to Railway API.');
  })
  .catch(console.error);
