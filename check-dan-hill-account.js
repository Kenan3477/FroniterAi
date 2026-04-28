/**
 * Check Dan Hill's User Account
 * Verify if user exists and is active
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDanHillAccount() {
  console.log('\n🔍 Checking Dan Hill\'s Account Status\n');
  console.log('='.repeat(60));
  
  try {
    // Search for Dan Hill user account
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Dan', mode: 'insensitive' } },
          { lastName: { contains: 'Hill', mode: 'insensitive' } },
          { username: { contains: 'dan', mode: 'insensitive' } },
          { username: { contains: 'hill', mode: 'insensitive' } },
          { email: { contains: 'dan', mode: 'insensitive' } }
        ]
      }
    });
    
    if (users.length === 0) {
      console.log('❌ NO USER FOUND matching "Dan Hill"');
      console.log('\n📝 Dan Hill\'s user account does NOT exist in the database!');
      console.log('\n🔧 TO FIX: Create Dan Hill\'s account:\n');
      console.log('Option 1: Use Admin Panel');
      console.log('  - Login as admin → Admin → Users → Add User');
      console.log('  - Fill in: Dan Hill, email, password, role (AGENT)');
      console.log('\nOption 2: Run SQL in Railway PostgreSQL:');
      console.log(`
INSERT INTO public."User" 
("id", "username", "email", "password", "firstName", "lastName", "role", "isActive", "createdAt", "updatedAt")
VALUES 
(gen_random_uuid(), 'dan.hill', 'dan.hill@example.com', 'HASHED_PASSWORD', 'Dan', 'Hill', 'AGENT', true, NOW(), NOW());
      `);
      console.log('⚠️  Note: Password must be bcrypt hashed!');
      
    } else {
      console.log(`✅ Found ${users.length} user(s) matching "Dan Hill":\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive ? '✅ YES' : '❌ NO (INACTIVE!)'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
        
        if (!user.isActive) {
          console.log('   ⚠️  ACCOUNT IS INACTIVE - Dan Hill cannot login!');
          console.log(`   🔧 TO FIX: UPDATE public."User" SET "isActive" = true WHERE "id" = '${user.id}';`);
        }
        
        console.log('');
      });
    }
    
    // Also check IP whitelist
    console.log('\n📋 Checking IP Whitelist for 145.224.65.166:');
    console.log('-'.repeat(60));
    
    const ipEntry = await prisma.ipWhitelist.findFirst({
      where: { ipAddress: '145.224.65.166' }
    });
    
    if (ipEntry) {
      console.log('✅ IP 145.224.65.166 IS whitelisted');
      console.log(`   Name: ${ipEntry.name}`);
      console.log(`   Description: ${ipEntry.description}`);
      console.log(`   Active: ${ipEntry.isActive ? 'YES' : 'NO (INACTIVE!)'}`);
      console.log(`   Added: ${ipEntry.addedAt}`);
      console.log(`   Activity Count: ${ipEntry.activityCount}`);
    } else {
      console.log('❌ IP 145.224.65.166 NOT found in whitelist');
      console.log('\n🔧 TO FIX: Add IP to whitelist:');
      console.log(`
INSERT INTO public."IPWhitelist" 
("ipAddress", "name", "description", "isActive", "createdAt", "activityCount") 
VALUES 
('145.224.65.166', 'Dan Hill', 'Agent access', true, NOW(), 0);
      `);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDanHillAccount().catch(console.error);
