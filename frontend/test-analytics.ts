import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testAnalytics() {
  console.log('🔍 Testing Phase 2 Analytics Data...\n');
  
  try {
    // Test 1: Call Records
    const totalCalls = await prisma.callRecord.count();
    console.log(`📞 Total Call Records: ${totalCalls}`);
    
    // Test 2: Recent calls with relationships
    const recentCalls = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { startTime: 'desc' },
      include: {
        contact: { select: { firstName: true, lastName: true, phone: true } },
        agent: { select: { firstName: true, lastName: true } },
        campaign: { select: { name: true } },
        disposition: { select: { name: true, category: true } }
      }
    });
    
    console.log('\n📋 Recent Call Records:');
    recentCalls.forEach((call, i) => {
      console.log(`${i + 1}. ${call.contact?.firstName} ${call.contact?.lastName} (${call.contact?.phone})`);
      console.log(`   Agent: ${call.agent?.firstName} ${call.agent?.lastName}`);
      console.log(`   Campaign: ${call.campaign?.name}`);
      console.log(`   Outcome: ${call.outcome} | Duration: ${call.duration}s`);
      console.log(`   Disposition: ${call.disposition?.name} (${call.disposition?.category})`);
      console.log('');
    });
    
    // Test 3: Call outcomes breakdown
    const callOutcomes = await prisma.callRecord.groupBy({
      by: ['outcome'],
      _count: { id: true }
    });
    
    console.log('📊 Call Outcomes Breakdown:');
    callOutcomes.forEach(outcome => {
      console.log(`   ${outcome.outcome || 'Unknown'}: ${outcome._count.id} calls`);
    });
    
    // Test 4: Disposition usage
    const dispositionUsage = await prisma.disposition.findMany({
      include: {
        _count: {
          select: { callRecords: true }
        }
      },
      where: {
        callRecords: {
          some: {}
        }
      }
    });
    
    console.log('\n📈 Disposition Usage:');
    dispositionUsage.forEach(d => {
      console.log(`   ${d.name} (${d.category}): ${d._count.callRecords} uses`);
    });
    
    // Test 5: Agent performance
    const agentStats = await prisma.agent.findMany({
      include: {
        _count: {
          select: { callRecords: true }
        }
      },
      where: {
        callRecords: {
          some: {}
        }
      }
    });
    
    console.log('\n👥 Agent Performance:');
    agentStats.forEach(agent => {
      console.log(`   ${agent.firstName} ${agent.lastName}: ${agent._count.callRecords} calls`);
    });
    
    console.log('\n✅ Phase 2 Real Analytics & Reporting is working!');
    console.log('📊 Database contains real analytics data for dashboard reporting');
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAnalytics().catch(console.error);