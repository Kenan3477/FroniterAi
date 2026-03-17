/**
 * COMPREHENSIVE CALL SYSTEM FIX
 * Fixes call disposition saving and ending flow issues
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:FkcSYGLtJuqxGbNWWNkQCfNTKwCDPEcq@junction.proxy.rlwy.net:13950/railway'
});

async function diagnoseProblem() {
  console.log('🔍 DIAGNOSING CALL SYSTEM ISSUES');
  console.log('=================================\n');

  try {
    // 1. Check recent call records to see the current state
    console.log('📊 Checking recent call records...');
    const recentCalls = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: true,
        contact: true
      }
    });

    console.log(`Found ${recentCalls.length} recent calls:`);
    recentCalls.forEach((call, i) => {
      console.log(`\nCall ${i + 1}:`);
      console.log(`  📞 Phone: ${call.phoneNumber || 'NULL'}`);
      console.log(`  👤 Agent: ${call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : 'NULL'}`);
      console.log(`  🏢 Contact: ${call.contact ? `${call.contact.firstName} ${call.contact.lastName}` : 'NULL'}`);
      console.log(`  ⏱️  Duration: ${call.duration || 0}s`);
      console.log(`  📋 Outcome: ${call.outcome || 'NULL'}`);
      console.log(`  🕐 Created: ${call.createdAt}`);
    });

    // 2. Check if there are any interactions (dispositions)
    console.log('\n📋 Checking recent interactions (dispositions)...');
    const recentInteractions = await prisma.interaction.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' }
    });

    console.log(`Found ${recentInteractions.length} recent interactions:`);
    recentInteractions.forEach((interaction, i) => {
      console.log(`\nInteraction ${i + 1}:`);
      console.log(`  👤 Agent: ${interaction.agentId}`);
      console.log(`  🏢 Contact: ${interaction.contactId}`);
      console.log(`  📋 Outcome: ${interaction.outcome}`);
      console.log(`  ⏱️  Duration: ${interaction.durationSeconds}s`);
    });

    // 3. Check if there are any agents
    console.log('\n👥 Checking agents...');
    const agents = await prisma.agent.findMany();
    console.log(`Found ${agents.length} agents:`);
    agents.forEach(agent => {
      console.log(`  - ${agent.firstName} ${agent.lastName} (${agent.agentId}) - ${agent.email}`);
    });

    // 4. Check users
    console.log('\n👤 Checking users...');
    const users = await prisma.user.findMany({
      select: { id: true, username: true, firstName: true, lastName: true, email: true, role: true }
    });
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.username}) - ${user.role} - ${user.email}`);
    });

    return {
      callsCount: recentCalls.length,
      interactionsCount: recentInteractions.length,
      agentsCount: agents.length,
      usersCount: users.length,
      latestCall: recentCalls[0],
      latestInteraction: recentInteractions[0]
    };

  } catch (error) {
    console.error('❌ Error diagnosing problem:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function runDiagnosis() {
  try {
    console.log('🩺 CALL SYSTEM HEALTH CHECK');
    console.log('============================\n');
    
    const results = await diagnoseProblem();
    
    console.log('\n📊 DIAGNOSIS SUMMARY:');
    console.log(`- Recent calls: ${results.callsCount}`);
    console.log(`- Recent dispositions: ${results.interactionsCount}`);
    console.log(`- Available agents: ${results.agentsCount}`);
    console.log(`- System users: ${results.usersCount}`);
    
    console.log('\n🔍 ISSUE ANALYSIS:');
    
    if (results.callsCount === 0) {
      console.log('❌ NO CALL RECORDS FOUND - Calls might not be saving properly');
    } else {
      console.log('✅ Call records are being created');
      
      if (results.latestCall?.agent) {
        console.log('✅ Latest call has agent data');
      } else {
        console.log('❌ Latest call missing agent data');
      }
      
      if (results.latestCall?.phoneNumber && results.latestCall.phoneNumber !== 'Unknown') {
        console.log('✅ Latest call has phone number');
      } else {
        console.log('❌ Latest call missing phone number');
      }
    }
    
    if (results.interactionsCount === 0) {
      console.log('❌ NO DISPOSITION RECORDS FOUND - Dispositions not saving');
    } else {
      console.log('✅ Disposition records are being created');
    }
    
    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('1. Test making a call through Omnivox frontend');
    console.log('2. Check browser console for any disposition save errors');
    console.log('3. Verify the frontend is sending proper auth tokens');
    console.log('4. Check Railway logs for any backend errors during call ending');
    
  } catch (error) {
    console.error('💥 Diagnosis failed:', error.message);
  }
}

runDiagnosis();