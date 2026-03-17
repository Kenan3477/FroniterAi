/**
 * Test script to verify call recording data fixes
 * This will test that new calls store proper agent, contact, and phone number data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:FkcSYGLtJuqxGbNWWNkQCfNTKwCDPEcq@junction.proxy.rlwy.net:13950/railway'
});

async function testCallRecordingFix() {
  console.log('🧪 Testing Call Recording Data Fix...\n');
  
  try {
    // 1. Check recent call records to see current state
    console.log('📊 Checking recent call records...');
    const recentRecords = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: true,
        contact: true
      }
    });
    
    console.log(`Found ${recentRecords.length} recent call records:`);
    recentRecords.forEach((record, i) => {
      console.log(`\nCall ${i + 1}:`);
      console.log(`  📞 Phone Number: ${record.phoneNumber || 'NULL'}`);
      console.log(`  👤 Agent: ${record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'NULL/MISSING'}`);
      console.log(`  🏢 Contact: ${record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'NULL/MISSING'}`);
      console.log(`  🕐 Created: ${record.createdAt}`);
      console.log(`  🆔 Call ID: ${record.callId}`);
      console.log(`  🔗 Agent ID: ${record.agentId || 'NULL'}`);
      console.log(`  🔗 Contact ID: ${record.contactId || 'NULL'}`);
    });
    
    // 2. Check users and their corresponding agents
    console.log('\n\n👥 Checking users and agents...');
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'AGENT'] }
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });
    
    console.log(`Found ${users.length} users:`);
    for (const user of users) {
      console.log(`\n👤 User: ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👔 Role: ${user.role}`);
      console.log(`   🆔 User ID: ${user.id}`);
      
      // Check if this user has a corresponding agent
      const agent = await prisma.agent.findUnique({
        where: { email: user.email }
      });
      
      if (agent) {
        console.log(`   ✅ Agent: ${agent.firstName} ${agent.lastName} (${agent.agentId})`);
      } else {
        console.log(`   ❌ No agent record found`);
      }
    }
    
    // 3. Check for any contacts named "John Turner" that need fixing
    console.log('\n\n🔍 Checking for "John Turner" contacts...');
    const johnTurnerContacts = await prisma.contact.findMany({
      where: {
        firstName: 'John',
        lastName: 'Turner'
      }
    });
    
    if (johnTurnerContacts.length > 0) {
      console.log(`⚠️  Found ${johnTurnerContacts.length} "John Turner" contacts:`);
      johnTurnerContacts.forEach(contact => {
        console.log(`   📞 ${contact.phone} - Contact ID: ${contact.contactId}`);
      });
      
      console.log('\n💡 These should be updated to "Unknown Contact" for manual dials');
    } else {
      console.log('✅ No "John Turner" contacts found');
    }
    
    // 4. Test data for validation
    console.log('\n\n📋 SUMMARY:');
    console.log(`- Total recent calls: ${recentRecords.length}`);
    console.log(`- Calls with proper agent data: ${recentRecords.filter(r => r.agent && r.agent.firstName !== 'System').length}`);
    console.log(`- Calls with proper phone numbers: ${recentRecords.filter(r => r.phoneNumber && r.phoneNumber !== 'Unknown').length}`);
    console.log(`- Calls with proper contact data: ${recentRecords.filter(r => r.contact && r.contact.firstName !== 'John').length}`);
    console.log(`- Available users: ${users.length}`);
    console.log(`- Users with agent records: ${(await Promise.all(users.map(async u => await prisma.agent.findUnique({ where: { email: u.email } })))).filter(Boolean).length}`);
    
    console.log('\n✅ Test completed. Review the data above to verify the fix is working.');
    
  } catch (error) {
    console.error('❌ Error testing call recording fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCallRecordingFix();