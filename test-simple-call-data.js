#!/usr/bin/env node
/**
 * Simple Test - Query Call Records Directly
 * This bypasses the complex analytics service and just shows raw call data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function testSimpleCallRecords() {
  try {
    console.log('🔍 Testing simple call records query...');
    
    // Get total count
    const totalCalls = await prisma.callRecord.count();
    console.log(`📊 Total calls in database: ${totalCalls}`);
    
    if (totalCalls > 0) {
      // Get recent calls
      const recentCalls = await prisma.callRecord.findMany({
        orderBy: { startTime: 'desc' },
        take: 5,
        include: {
          agent: true,
          contact: true,
          campaign: true
        }
      });
      
      console.log('\n📞 Recent calls:');
      recentCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call.callId}`);
        console.log(`   📱 Phone: ${call.phoneNumber}`);
        console.log(`   👤 Agent: ${call.agent?.firstName || 'Unknown'} ${call.agent?.lastName || ''}`);
        console.log(`   📋 Campaign: ${call.campaign?.name || 'Unknown'}`);
        console.log(`   ⏱️  Duration: ${call.duration || 0}s`);
        console.log(`   📅 Start: ${call.startTime}`);
        console.log(`   📊 Outcome: ${call.outcome}`);
        console.log('   ---');
      });
      
      // Count by outcome
      const outcomes = await prisma.callRecord.groupBy({
        by: ['outcome'],
        _count: { _all: true }
      });
      
      console.log('\n📈 Outcomes breakdown:');
      outcomes.forEach(outcome => {
        console.log(`   ${outcome.outcome}: ${outcome._count._all} calls`);
      });
      
      // Simple KPIs that work
      const connectedOutcomes = ['answered', 'connected', 'completed', 'transfer'];
      const connectedCalls = await prisma.callRecord.count({
        where: { outcome: { in: connectedOutcomes } }
      });
      
      const answerRate = totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : 0;
      
      console.log('\n✅ Simple KPIs that work:');
      console.log(`   Total Calls: ${totalCalls}`);
      console.log(`   Connected Calls: ${connectedCalls}`);
      console.log(`   Answer Rate: ${answerRate}%`);
      
      console.log('\n🎯 CONCLUSION: Call records exist and can be queried successfully!');
      console.log('📝 The issue is in the complex analytics service, not the data itself.');
    }
    
  } catch (error) {
    console.error('❌ Error querying call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleCallRecords();