const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testUserCreationAndLoginFlow() {
  try {
    console.log('\n🧪 TESTING USER CREATION & LOGIN FLOW\n');
    console.log('='.repeat(60));
    
    // Test 1: Create a test user (simulate backend POST /api/admin/users)
    console.log('\n📝 TEST 1: Creating test user...');
    
    const testUserData = {
      name: 'Test User',
      email: 'testuser@omnivox-ai.com',
      password: 'TestPass123!',
      role: 'AGENT'
    };
    
    // Split name into firstName and lastName (same as backend)
    const nameParts = testUserData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const username = testUserData.email.toLowerCase().trim();
    
    console.log('  User data:');
    console.log('    - Name:', testUserData.name);
    console.log('    - Email:', testUserData.email);
    console.log('    - Username (generated):', username);
    console.log('    - Role:', testUserData.role);
    console.log('    - Password:', testUserData.password);
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: testUserData.email.toLowerCase() }
    });
    
    if (existing) {
      console.log('  ⚠️  User already exists, deleting first...');
      await prisma.user.delete({
        where: { id: existing.id }
      });
    }
    
    // Hash password (same as backend)
    console.log('\n  🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(testUserData.password, 12);
    console.log('    - Hash length:', hashedPassword.length);
    console.log('    - Hash starts with:', hashedPassword.substring(0, 10));
    
    // Test the hash immediately
    const immediateTest = await bcrypt.compare(testUserData.password, hashedPassword);
    console.log('    - Immediate verification:', immediateTest ? '✅ PASS' : '❌ FAIL');
    
    if (!immediateTest) {
      console.error('❌ CRITICAL: Hash verification failed immediately!');
      return;
    }
    
    // Create user (same as backend)
    const createdUser = await prisma.user.create({
      data: {
        username: username,
        email: testUserData.email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        name: testUserData.name,
        role: testUserData.role.toUpperCase(),
        isActive: true,
        status: 'away'
      }
    });
    
    console.log('\n  ✅ User created successfully!');
    console.log('    - ID:', createdUser.id);
    console.log('    - Username:', createdUser.username);
    console.log('    - Email:', createdUser.email);
    console.log('    - Role:', createdUser.role);
    console.log('    - Active:', createdUser.isActive);
    
    // Test 2: Verify user can be found (simulate login lookup)
    console.log('\n📝 TEST 2: Finding user for login...');
    
    const foundUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: testUserData.email.toLowerCase() },
          { username: testUserData.email.toLowerCase() }
        ]
      }
    });
    
    if (!foundUser) {
      console.error('❌ FAIL: User not found with email/username lookup!');
      return;
    }
    
    console.log('  ✅ User found successfully!');
    console.log('    - ID:', foundUser.id);
    console.log('    - Email:', foundUser.email);
    console.log('    - Username:', foundUser.username);
    console.log('    - Active:', foundUser.isActive);
    
    // Test 3: Verify password (simulate login password check)
    console.log('\n📝 TEST 3: Verifying password...');
    
    const isPasswordValid = await bcrypt.compare(testUserData.password, foundUser.password);
    
    if (!isPasswordValid) {
      console.error('❌ FAIL: Password verification failed!');
      console.log('    - Input password:', testUserData.password);
      console.log('    - Stored hash:', foundUser.password);
      return;
    }
    
    console.log('  ✅ Password verified successfully!');
    
    // Test 4: Test with wrong password
    console.log('\n📝 TEST 4: Testing with wrong password...');
    
    const wrongPasswordTest = await bcrypt.compare('WrongPassword123!', foundUser.password);
    
    if (wrongPasswordTest) {
      console.error('❌ FAIL: Wrong password was accepted!');
      return;
    }
    
    console.log('  ✅ Wrong password correctly rejected!');
    
    // Test 5: Verify user appears in GET /api/admin/users
    console.log('\n📝 TEST 5: Verifying user appears in user list...');
    
    const allUsers = await prisma.user.findMany({
      where: {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        status: true
      }
    });
    
    const testUserInList = allUsers.find(u => u.email === testUserData.email.toLowerCase());
    
    if (!testUserInList) {
      console.error('❌ FAIL: Created user not found in user list!');
      return;
    }
    
    console.log('  ✅ User appears in user list!');
    console.log('    - Total users in system:', allUsers.length);
    console.log('    - Test user visible:', testUserInList.name);
    
    // Test 6: Test deletion
    console.log('\n📝 TEST 6: Testing user deletion...');
    
    await prisma.user.delete({
      where: { id: createdUser.id }
    });
    
    const deletedUserCheck = await prisma.user.findUnique({
      where: { id: createdUser.id }
    });
    
    if (deletedUserCheck) {
      console.error('❌ FAIL: User still exists after deletion!');
      return;
    }
    
    console.log('  ✅ User deleted successfully!');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ User Creation Flow: WORKING');
    console.log('✅ Password Hashing: WORKING');
    console.log('✅ Login Lookup: WORKING');
    console.log('✅ Password Verification: WORKING');
    console.log('✅ User List Visibility: WORKING');
    console.log('✅ User Deletion: WORKING');
    console.log('\n💡 Created users CAN log in successfully!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testUserCreationAndLoginFlow();
