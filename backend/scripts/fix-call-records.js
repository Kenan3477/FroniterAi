/**
 * Railway deployment script to fix call records data
 * This script will be run once on Railway to fix existing bad data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProductionCallRecords() {
  console.log('🔧 FIXING PRODUCTION CALL RECORDS DATA...');
  console.log('=========================================\n');

  try {
    // 1. Get all users and create corresponding agents
    console.log('👥 Step 1: Ensuring all users have agent records...');
    
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });
    
    console.log(`Found ${allUsers.length} users in database`);
    
    const agentMap = new Map();
    
    for (const user of allUsers) {
      // Check if agent already exists
      let agent = await prisma.agent.findUnique({
        where: { email: user.email }
      });
      
      if (!agent) {
        // Create agent for this user
        const agentId = `agent-${user.id}`;
        agent = await prisma.agent.create({
          data: {
            agentId: agentId,
            firstName: user.firstName || user.username || 'Unknown',
            lastName: user.lastName || 'User',
            email: user.email,
            status: 'Available'
          }
        });
        console.log(`✅ Created agent for ${user.username}: ${agent.agentId}`);
      } else {
        console.log(`✅ Found existing agent for ${user.username}: ${agent.agentId}`);
      }
      
      agentMap.set(user.id, agent.agentId);
    }

    // 2. Fix all call records with null/missing agent IDs
    console.log('\n📞 Step 2: Fixing call records with missing agent data...');
    
    const callsNeedingAgents = await prisma.callRecord.findMany({
      where: {
        OR: [
          { agentId: null },
          { agentId: '' }
        ]
      }
    });
    
    console.log(`Found ${callsNeedingAgents.length} calls needing agent assignment`);
    
    // Use the first admin user's agent for all orphaned calls
    const adminUser = allUsers.find(u => u.role === 'ADMIN' || u.username.toLowerCase().includes('admin'));
    if (adminUser && agentMap.has(adminUser.id)) {
      const adminAgentId = agentMap.get(adminUser.id);
      console.log(`Using admin agent ${adminAgentId} for orphaned calls`);
      
      await prisma.callRecord.updateMany({
        where: {
          OR: [
            { agentId: null },
            { agentId: '' }
          ]
        },
        data: {
          agentId: adminAgentId
        }
      });
      
      console.log(`✅ Updated ${callsNeedingAgents.length} call records with agent data`);
    }

    // 3. Fix "John Turner" contacts
    console.log('\n👤 Step 3: Fixing John Turner contacts...');
    
    const johnTurnerCount = await prisma.contact.updateMany({
      where: {
        AND: [
          { firstName: 'John' },
          { lastName: 'Turner' }
        ]
      },
      data: {
        firstName: 'Unknown',
        lastName: 'Contact'
      }
    });
    
    console.log(`✅ Updated ${johnTurnerCount.count} John Turner contacts to Unknown Contact`);

    // 4. Fix phone number issues
    console.log('\n📱 Step 4: Fixing phone number data...');
    
    // Update records where phoneNumber is null but dialedNumber exists
    const phoneFixResult1 = await prisma.$executeRaw`
      UPDATE "call_records" 
      SET "phoneNumber" = "dialedNumber" 
      WHERE ("phoneNumber" IS NULL OR "phoneNumber" = '' OR "phoneNumber" = 'Unknown') 
      AND "dialedNumber" IS NOT NULL 
      AND "dialedNumber" != '' 
      AND "dialedNumber" != 'Unknown'
    `;
    
    console.log(`✅ Fixed ${phoneFixResult1} phone numbers from dialedNumber field`);

    // Update records where both are null but we can get from contact
    const callsNeedingPhones = await prisma.callRecord.findMany({
      where: {
        OR: [
          { phoneNumber: null },
          { phoneNumber: '' },
          { phoneNumber: 'Unknown' }
        ]
      },
      include: {
        contact: {
          select: {
            phone: true,
            mobile: true,
            workPhone: true,
            homePhone: true
          }
        }
      }
    });

    let phoneUpdateCount = 0;
    for (const call of callsNeedingPhones) {
      if (call.contact) {
        const phone = call.contact.phone || call.contact.mobile || call.contact.workPhone || call.contact.homePhone;
        if (phone && phone !== 'Unknown') {
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              phoneNumber: phone,
              dialedNumber: phone
            }
          });
          phoneUpdateCount++;
        }
      }
    }
    
    console.log(`✅ Fixed ${phoneUpdateCount} phone numbers from contact data`);

    // 5. Final verification
    console.log('\n🔍 Step 5: Final verification...');
    
    const stats = {
      totalCalls: await prisma.callRecord.count(),
      callsWithAgents: await prisma.callRecord.count({
        where: { agentId: { not: null, not: '' } }
      }),
      callsWithPhones: await prisma.callRecord.count({
        where: { 
          phoneNumber: { 
            not: null,
            not: '',
            not: 'Unknown'
          } 
        }
      }),
      johnTurnerRemaining: await prisma.contact.count({
        where: {
          firstName: 'John',
          lastName: 'Turner'
        }
      })
    };
    
    console.log('\n📊 FINAL STATISTICS:');
    console.log(`- Total calls: ${stats.totalCalls}`);
    console.log(`- Calls with agents: ${stats.callsWithAgents}/${stats.totalCalls} (${Math.round(stats.callsWithAgents/stats.totalCalls*100)}%)`);
    console.log(`- Calls with phones: ${stats.callsWithPhones}/${stats.totalCalls} (${Math.round(stats.callsWithPhones/stats.totalCalls*100)}%)`);
    console.log(`- John Turner contacts remaining: ${stats.johnTurnerRemaining}`);
    
    console.log('\n✅ PRODUCTION DATA FIX COMPLETED!');
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error fixing production data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { fixProductionCallRecords };

// If run directly
if (require.main === module) {
  fixProductionCallRecords()
    .then((stats) => {
      console.log('\n🎉 Production fix completed successfully!', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Production fix failed:', error);
      process.exit(1);
    });
}