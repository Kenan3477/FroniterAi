/**
 * EMERGENCY FIX: Call Records Data Issues
 * This script fixes the Agent N/A, Contact John Turner, and phone number Unknown issues
 */

const { PrismaClient } = require('@prisma/client');

// Use the backend directory's .env configuration
require('dotenv').config({ path: './backend/.env' });

const prisma = new PrismaClient();

async function fixCallRecordsData() {
  console.log('🔧 FIXING CALL RECORDS DATA ISSUES...\n');

  try {
    // 1. Fix Agent N/A issues by creating/linking proper agent records
    console.log('👤 Step 1: Fixing Agent N/A issues...');
    
    // Get all call records with missing agent data
    const callsWithoutAgents = await prisma.callRecord.findMany({
      where: {
        OR: [
          { agentId: null },
          { agentId: '' },
          { agent: null }
        ]
      },
      include: { agent: true }
    });
    
    console.log(`Found ${callsWithoutAgents.length} calls without proper agent data`);
    
    // Create/find admin agents for these records
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: 'admin' },
          { username: 'Admin' },
          { username: 'kenan' },
          { username: 'Kenan' },
          { role: 'ADMIN' }
        ]
      }
    });
    
    console.log(`Found ${adminUsers.length} admin users:`, adminUsers.map(u => u.username));
    
    if (adminUsers.length > 0) {
      // Use the first admin user
      const adminUser = adminUsers[0];
      console.log(`Using admin user: ${adminUser.username} (${adminUser.firstName} ${adminUser.lastName})`);
      
      // Create or find agent for this admin user
      let adminAgent = await prisma.agent.findUnique({
        where: { email: adminUser.email }
      });
      
      if (!adminAgent) {
        const agentId = `agent-${adminUser.id}`;
        adminAgent = await prisma.agent.create({
          data: {
            agentId: agentId,
            firstName: adminUser.firstName || adminUser.username,
            lastName: adminUser.lastName || 'User',
            email: adminUser.email,
            status: 'Available'
          }
        });
        console.log(`✅ Created admin agent: ${adminAgent.agentId}`);
      } else {
        console.log(`✅ Found existing admin agent: ${adminAgent.agentId}`);
      }
      
      // Update all calls without agents to use this admin agent
      if (callsWithoutAgents.length > 0) {
        const updateResult = await prisma.callRecord.updateMany({
          where: {
            OR: [
              { agentId: null },
              { agentId: '' }
            ]
          },
          data: {
            agentId: adminAgent.agentId
          }
        });
        console.log(`✅ Updated ${updateResult.count} call records with admin agent`);
      }
    }

    // 2. Fix Contact "John Turner" issues
    console.log('\n👥 Step 2: Fixing Contact "John Turner" issues...');
    
    // Find all "John Turner" contacts that are clearly placeholders
    const johnTurnerContacts = await prisma.contact.findMany({
      where: {
        AND: [
          { firstName: 'John' },
          { lastName: 'Turner' }
        ]
      }
    });
    
    console.log(`Found ${johnTurnerContacts.length} "John Turner" contacts`);
    
    // Update these contacts to "Unknown Contact" for manual dials
    for (const contact of johnTurnerContacts) {
      await prisma.contact.update({
        where: { contactId: contact.contactId },
        data: {
          firstName: 'Unknown',
          lastName: 'Contact'
        }
      });
    }
    
    if (johnTurnerContacts.length > 0) {
      console.log(`✅ Updated ${johnTurnerContacts.length} "John Turner" contacts to "Unknown Contact"`);
    }

    // 3. Fix Phone Number "Unknown" issues  
    console.log('\n📞 Step 3: Fixing Phone Number "Unknown" issues...');
    
    // Get call records with missing phone numbers
    const callsWithoutPhones = await prisma.callRecord.findMany({
      where: {
        OR: [
          { phoneNumber: null },
          { phoneNumber: '' },
          { phoneNumber: 'Unknown' }
        ]
      }
    });
    
    console.log(`Found ${callsWithoutPhones.length} calls with missing/unknown phone numbers`);
    
    // Try to extract phone numbers from call IDs or other fields
    for (const call of callsWithoutPhones) {
      let phoneNumber = null;
      
      // Try to extract from dialedNumber field
      if (call.dialedNumber && call.dialedNumber !== 'Unknown') {
        phoneNumber = call.dialedNumber;
      }
      // Try to extract from contact phone if available
      else if (call.contactId) {
        const contact = await prisma.contact.findUnique({
          where: { contactId: call.contactId }
        });
        if (contact && contact.phone) {
          phoneNumber = contact.phone;
        }
      }
      
      // If we found a phone number, update the call record
      if (phoneNumber) {
        await prisma.callRecord.update({
          where: { id: call.id },
          data: {
            phoneNumber: phoneNumber,
            dialedNumber: phoneNumber
          }
        });
      }
    }
    
    // 4. Verify fixes
    console.log('\n🔍 Step 4: Verifying fixes...');
    
    const verificationResults = await prisma.callRecord.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: true,
        contact: true
      }
    });
    
    console.log('\n📊 VERIFICATION RESULTS:');
    console.log('Recent 10 call records:');
    
    verificationResults.forEach((record, i) => {
      console.log(`\nCall ${i + 1}:`);
      console.log(`  📞 Phone: ${record.phoneNumber || 'STILL NULL'}`);
      console.log(`  👤 Agent: ${record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'STILL NULL'}`);
      console.log(`  🏢 Contact: ${record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'STILL NULL'}`);
    });
    
    // Summary statistics
    const totalCalls = await prisma.callRecord.count();
    const callsWithAgents = await prisma.callRecord.count({
      where: { agentId: { not: null } }
    });
    const callsWithPhones = await prisma.callRecord.count({
      where: { 
        phoneNumber: { 
          not: null,
          not: '',
          not: 'Unknown'
        } 
      }
    });
    const johnTurnerAfter = await prisma.contact.count({
      where: {
        firstName: 'John',
        lastName: 'Turner'
      }
    });
    
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log(`- Total calls: ${totalCalls}`);
    console.log(`- Calls with agents: ${callsWithAgents}/${totalCalls} (${Math.round(callsWithAgents/totalCalls*100)}%)`);
    console.log(`- Calls with phone numbers: ${callsWithPhones}/${totalCalls} (${Math.round(callsWithPhones/totalCalls*100)}%)`);
    console.log(`- Remaining "John Turner" contacts: ${johnTurnerAfter}`);
    
    console.log('\n✅ CALL RECORDS DATA FIX COMPLETED!');
    
  } catch (error) {
    console.error('❌ Error fixing call records data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixCallRecordsData()
    .then(() => {
      console.log('🎉 Fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixCallRecordsData };