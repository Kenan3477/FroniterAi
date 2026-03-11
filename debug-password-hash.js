/**
 * Debug Password Hashing for Railway
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function debugPassword() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
  });

  try {
    console.log('🔍 Debugging password hashing...\n');

    const testPassword = 'Admin123!';
    
    // Generate hash
    console.log('1. Generating new hash for password:', testPassword);
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log('   New hash:', newHash);

    // Test comparison
    const compareResult1 = await bcrypt.compare(testPassword, newHash);
    console.log('   Direct comparison with new hash:', compareResult1 ? '✓ PASS' : '✗ FAIL');

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@omnivox.ai' }
    });

    console.log('\n2. Current user in database:');
    console.log('   Email:', user.email);
    console.log('   Current hash:', user.password);
    console.log('   Hash starts with $2b$ or $2a$:', user.password.startsWith('$2b$') || user.password.startsWith('$2a$'));

    // Test comparison with current hash
    const compareResult2 = await bcrypt.compare(testPassword, user.password);
    console.log('   Comparison with current hash:', compareResult2 ? '✓ PASS' : '✗ FAIL');

    // Update with new hash
    console.log('\n3. Updating user with new hash...');
    await prisma.user.update({
      where: { email: 'admin@omnivox.ai' },
      data: { password: newHash }
    });

    // Verify update
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'admin@omnivox.ai' }
    });

    console.log('   Updated hash:', updatedUser.password);
    console.log('   Hashes match:', updatedUser.password === newHash ? '✓ YES' : '✗ NO');

    // Final test
    const compareResult3 = await bcrypt.compare(testPassword, updatedUser.password);
    console.log('   Comparison after update:', compareResult3 ? '✓ PASS' : '✗ FAIL');

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('  Password:', testPassword);
    console.log('  Hash generation:', '✓');
    console.log('  Database update:', '✓');
    console.log('  Password verification:', compareResult3 ? '✓ WORKING' : '✗ NOT WORKING');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPassword();
