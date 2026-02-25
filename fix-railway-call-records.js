/**
 * DIRECT DATABASE FIX for Call Records Issues
 * This connects directly to Railway's PostgreSQL database to fix the data
 */

const { PrismaClient } = require('@prisma/client');

// Use the backend .env for proper database connection
require('dotenv').config({ path: './backend/.env' });

// Railway database connection with explicit URL
const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:FkcSYGLtJuqxGbNWWNkQCfNTKwCDPEcq@junction.proxy.rlwy.net:13950/railway'
});

async function fixRailwayCallRecords() {
  console.log('🚀 FIXING RAILWAY CALL RECORDS DATA');
  console.log('====================================\n');

  try {
    console.log('🔗 Connecting to Railway database...');
    await prisma.$connect();
    console.log('✅ Connected to Railway database successfully\n');

    // 1. Check current state
    console.log('📊 Current State Analysis:');
    const currentStats = {
      totalCalls: await prisma.callRecord.count(),
      callsWithoutAgent: await prisma.callRecord.count({
        where: {
          OR: [
            { agentId: null },
            { agentId: '' }
          ]
        }
      }),
      callsWithUnknownPhone: await prisma.callRecord.count({
        where: {
          OR: [
            { phoneNumber: 'Unknown' },
            { phoneNumber: null },
            { phoneNumber: '' }
          ]
        }
      }),
      johnTurnerContacts: await prisma.contact.count({
        where: {
          AND: [
            { firstName: 'John' },
            { lastName: 'Turner' }
          ]
        }
      })
    };

    console.log('- Total call records:', currentStats.totalCalls);
    console.log('- Calls without agent:', currentStats.callsWithoutAgent);
    console.log('- Calls with Unknown phone:', currentStats.callsWithUnknownPhone);
    console.log('- John Turner contacts:', currentStats.johnTurnerContacts);

    // 2. Get all users and create agents
    console.log('\\n👥 Creating/Finding Agent Records:');
    const allUsers = await prisma.user.findMany();
    console.log(`Found ${allUsers.length} users in database`);

    const agentUpdates = [];
    for (const user of allUsers) {
      let agent = await prisma.agent.findUnique({
        where: { email: user.email }
      });

      if (!agent) {
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
        console.log(`✅ Created agent: ${agent.firstName} ${agent.lastName} (${agent.agentId})`);
        agentUpdates.push(`Created ${agent.agentId}`);
      } else {
        console.log(`✅ Found agent: ${agent.firstName} ${agent.lastName} (${agent.agentId})`);
      }
    }

    // 3. Fix call records without agents (use admin agent)
    console.log('\\n📞 Fixing Call Records without Agents:');
    const adminUser = allUsers.find(u => 
      u.role === 'ADMIN' || 
      u.username?.toLowerCase().includes('admin') ||
      u.email?.toLowerCase().includes('admin')
    );

    if (adminUser) {
      const adminAgent = await prisma.agent.findUnique({
        where: { email: adminUser.email }
      });

      if (adminAgent) {
        const agentFixResult = await prisma.callRecord.updateMany({
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
        console.log(`✅ Updated ${agentFixResult.count} call records with admin agent: ${adminAgent.agentId}`);
      }
    }

    // 4. Fix John Turner contacts
    console.log('\\n👤 Fixing John Turner Contacts:');
    const contactFixResult = await prisma.contact.updateMany({
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
    console.log(`✅ Updated ${contactFixResult.count} John Turner contacts to Unknown Contact`);

    // 5. Fix phone number issues
    console.log('\\n📱 Fixing Phone Number Issues:');
    
    // Method 1: Copy from dialedNumber to phoneNumber where missing
    const phoneFixQuery = `
      UPDATE "call_records" 
      SET "phoneNumber" = "dialedNumber" 
      WHERE ("phoneNumber" IS NULL OR "phoneNumber" = '' OR "phoneNumber" = 'Unknown') 
      AND "dialedNumber" IS NOT NULL 
      AND "dialedNumber" != '' 
      AND "dialedNumber" != 'Unknown'
    `;
    
    const phoneFixResult1 = await prisma.$executeRawUnsafe(phoneFixQuery);
    console.log(`✅ Fixed ${phoneFixResult1} phone numbers from dialedNumber field`);

    // Method 2: Get phone numbers from contact data
    const callsNeedingPhones = await prisma.callRecord.findMany({
      where: {
        OR: [
          { phoneNumber: 'Unknown' },
          { phoneNumber: '' }
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
      },
      take: 50 // Process in batches to avoid timeout
    });

    let phoneUpdateCount = 0;
    for (const call of callsNeedingPhones) {
      if (call.contact) {
        const phone = call.contact.phone || call.contact.mobile || call.contact.workPhone || call.contact.homePhone;
        if (phone && phone !== 'Unknown' && phone !== '') {
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              phoneNumber: phone,
              dialedNumber: phone || call.dialedNumber
            }
          });
          phoneUpdateCount++;
        }
      }
    }
    console.log(`✅ Fixed ${phoneUpdateCount} additional phone numbers from contact data`);

    // 6. Final verification
    console.log('\\n🔍 Final Verification:');
    const finalStats = {
      totalCalls: await prisma.callRecord.count(),
      callsWithAgent: await prisma.callRecord.count({
        where: {
          AND: [
            { agentId: { not: null } },
            { agentId: { not: '' } }
          ]
        }
      }),
      callsWithPhone: await prisma.callRecord.count({
        where: {
          AND: [
            { phoneNumber: { not: null } },
            { phoneNumber: { not: '' } },
            { phoneNumber: { not: 'Unknown' } }
          ]
        }
      }),
      johnTurnerRemaining: await prisma.contact.count({
        where: {
          firstName: 'John',
          lastName: 'Turner'
        }
      })
    };

    console.log('- Total calls:', finalStats.totalCalls);
    console.log('- Calls with agents:', `${finalStats.callsWithAgent}/${finalStats.totalCalls} (${Math.round(finalStats.callsWithAgent/finalStats.totalCalls*100)}%)`);
    console.log('- Calls with phones:', `${finalStats.callsWithPhone}/${finalStats.totalCalls} (${Math.round(finalStats.callsWithPhone/finalStats.totalCalls*100)}%)`);
    console.log('- John Turner remaining:', finalStats.johnTurnerRemaining);

    // 7. Show sample fixed records
    console.log('\\n📋 Sample Fixed Records:');
    const sampleRecords = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
            agentId: true
          }
        },
        contact: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    sampleRecords.forEach((record, i) => {
      console.log(`\\nRecord ${i + 1}:`);
      console.log(`  📞 Phone: ${record.phoneNumber || 'STILL NULL'}`);
      console.log(`  👤 Agent: ${record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'STILL NULL'}`);
      console.log(`  🏢 Contact: ${record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'STILL NULL'}`);
    });

    console.log('\\n🎉 RAILWAY CALL RECORDS FIX COMPLETED!');
    console.log('✅ The call recording display should now show correct data');
    console.log('📝 Refresh the Omnivox reports page to see the changes');

    return finalStats;

  } catch (error) {
    console.error('❌ Error fixing Railway call records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixRailwayCallRecords()
    .then((stats) => {
      console.log('\\n🏆 Fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixRailwayCallRecords };