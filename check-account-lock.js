const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAccountLock() {
  try {
    console.log('🔍 Checking for locked accounts...\n');

    const ken = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'ken@simpleemails.co.uk' },
          { username: 'ken' }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        failedLoginAttempts: true,
        accountLockedUntil: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!ken) {
      console.log('❌ Ken user not found!');
      return;
    }

    console.log('👤 Ken User Details:');
    console.log(`   ID: ${ken.id}`);
    console.log(`   Name: ${ken.firstName} ${ken.lastName}`);
    console.log(`   Username: ${ken.username}`);
    console.log(`   Email: ${ken.email || 'N/A'}`);
    console.log(`   Role: ${ken.role}`);
    console.log(`   Active: ${ken.isActive}`);
    console.log(`   Failed Login Attempts: ${ken.failedLoginAttempts || 0}`);
    console.log(`   Account Locked Until: ${ken.accountLockedUntil || 'Not locked'}`);
    console.log(`   Last Login: ${ken.lastLogin || 'Never'}`);
    console.log('');

    const now = new Date();
    const isLocked = ken.accountLockedUntil && new Date(ken.accountLockedUntil) > now;

    if (isLocked) {
      console.log('🔒 ACCOUNT IS LOCKED!');
      console.log(`   Locked until: ${ken.accountLockedUntil}`);
      console.log(`   Time remaining: ${Math.round((new Date(ken.accountLockedUntil) - now) / 60000)} minutes`);
      console.log('');
      console.log('💡 Unlocking account now...');

      await prisma.user.update({
        where: { id: ken.id },
        data: {
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });

      console.log('✅ Account unlocked successfully!');
      console.log('   Failed login attempts reset to 0');
      console.log('   Account lock removed');
    } else if (ken.failedLoginAttempts && ken.failedLoginAttempts > 0) {
      console.log(`⚠️  Account has ${ken.failedLoginAttempts} failed login attempts but is not locked`);
      console.log('💡 Resetting failed login attempts...');

      await prisma.user.update({
        where: { id: ken.id },
        data: {
          failedLoginAttempts: 0
        }
      });

      console.log('✅ Failed login attempts reset to 0');
    } else {
      console.log('✅ Account is not locked and has no failed login attempts');
    }

    console.log('');
    console.log('🌐 IP Whitelist Status:');
    console.log('   Office IP: 209.198.129.239 ✅ Pre-loaded in backend');
    console.log('   Home IP: 90.204.67.241 ✅ Pre-loaded in backend');
    console.log('');
    console.log('💡 These IPs now bypass:');
    console.log('   - Rate limiting (5 attempts per 15 minutes)');
    console.log('   - Security monitoring');
    console.log('   - Login attempt tracking');

  } catch (error) {
    console.error('❌ Error checking account lock:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccountLock();
