const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeSystemPerformance() {
  console.log('\n🔍 OMNIVOX PERFORMANCE & ERROR ANALYSIS');
  console.log('='.repeat(80));
  console.log(`Analysis Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  try {
    // 1. Check Database Connection Performance
    console.log('\n📊 DATABASE CONNECTION PERFORMANCE');
    console.log('-'.repeat(80));
    
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1 as test`;
    const dbLatency = Date.now() - dbStartTime;
    
    console.log(`✅ Database Connection: ${dbLatency}ms`);
    if (dbLatency > 1000) {
      console.log(`⚠️  WARNING: High database latency detected (${dbLatency}ms > 1000ms)`);
    } else if (dbLatency > 500) {
      console.log(`⚠️  CAUTION: Elevated database latency (${dbLatency}ms > 500ms)`);
    } else if (dbLatency > 100) {
      console.log(`   OK: Acceptable database latency (${dbLatency}ms)`);
    } else {
      console.log(`   EXCELLENT: Fast database response (${dbLatency}ms < 100ms)`);
    }

    // 2. Analyze Call Records (Last 7 days)
    console.log('\n📞 CALL RECORDS ANALYSIS (Last 7 Days)');
    console.log('-'.repeat(80));
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const startTime = Date.now();
    const recentCalls = await prisma.callRecord.findMany({
      where: {
        startTime: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 1000  // Limit for performance
    });
    const queryTime = Date.now() - startTime;
    
    console.log(`Total Calls (Last 7 Days): ${recentCalls.length}`);
    console.log(`Query Time: ${queryTime}ms`);
    
    if (queryTime > 5000) {
      console.log(`⚠️  CRITICAL: Slow query detected (${queryTime}ms > 5000ms)`);
    } else if (queryTime > 2000) {
      console.log(`⚠️  WARNING: Elevated query time (${queryTime}ms > 2000ms)`);
    } else {
      console.log(`✅ Query performance: Good`);
    }
    
    // Analyze call outcomes
    const outcomes = recentCalls.reduce((acc, call) => {
      const outcome = call.outcome || 'unknown';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nCall Outcomes:');
    Object.entries(outcomes).forEach(([outcome, count]) => {
      console.log(`  - ${outcome}: ${count}`);
    });
    
    // Check for calls without end times (stuck calls)
    const stuckCalls = recentCalls.filter(c => c.startTime && !c.endTime);
    if (stuckCalls.length > 0) {
      console.log(`\n⚠️  ISSUE: ${stuckCalls.length} calls without end times (stuck calls)`);
      console.log('   Recent stuck calls:');
      stuckCalls.slice(0, 5).forEach(call => {
        console.log(`   - Call ${call.id}: Started ${call.startTime}, No end time`);
      });
    } else {
      console.log(`\n✅ No stuck calls detected`);
    }
    
    // Check call durations
    const callsWithDuration = recentCalls.filter(c => c.duration && c.duration > 0);
    if (callsWithDuration.length > 0) {
      const avgDuration = callsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) / callsWithDuration.length;
      const maxDuration = Math.max(...callsWithDuration.map(c => c.duration || 0));
      const minDuration = Math.min(...callsWithDuration.map(c => c.duration || 0));
      
      console.log(`\nCall Duration Stats:`);
      console.log(`  - Average: ${Math.round(avgDuration)}s`);
      console.log(`  - Max: ${Math.round(maxDuration)}s`);
      console.log(`  - Min: ${Math.round(minDuration)}s`);
    }

    // 3. Analyze Agent Activity
    console.log('\n👥 AGENT ACTIVITY ANALYSIS');
    console.log('-'.repeat(80));
    
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        agentId: true,
        status: true,
        currentCall: true,
        updatedAt: true
      }
    });
    
    console.log(`Total Agents: ${agents.length}`);
    
    const agentsByStatus = agents.reduce((acc, agent) => {
      const status = agent.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Agent Status Distribution:');
    Object.entries(agentsByStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
    
    // Check for agents with stale currentCall
    const agentsWithStaleCall = agents.filter(a => a.currentCall && a.currentCall !== 'null');
    if (agentsWithStaleCall.length > 0) {
      console.log(`\n⚠️  ${agentsWithStaleCall.length} agents have currentCall set (potential stuck state)`);
    } else {
      console.log(`\n✅ No agents with stuck call state`);
    }

    // 4. Check for Database Issues
    console.log('\n🗄️  DATABASE HEALTH CHECK');
    console.log('-'.repeat(80));
    
    // Check table sizes
    const userCount = await prisma.user.count();
    const campaignCount = await prisma.campaign.count();
    const contactCount = await prisma.contact.count();
    const callRecordCount = await prisma.callRecord.count();
    
    console.log('Table Sizes:');
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Campaigns: ${campaignCount}`);
    console.log(`  - Contacts: ${contactCount}`);
    console.log(`  - Call Records: ${callRecordCount}`);
    
    // Warn about large tables
    if (callRecordCount > 100000) {
      console.log(`\n⚠️  WARNING: Large call_records table (${callRecordCount} records)`);
      console.log('   Consider archiving old records to improve performance');
    }
    
    if (contactCount > 500000) {
      console.log(`\n⚠️  WARNING: Large contacts table (${contactCount} records)`);
      console.log('   Consider implementing pagination and indexing');
    }

    // 5. Check for Recent Errors (System Events)
    console.log('\n❌ RECENT ERROR ANALYSIS');
    console.log('-'.repeat(80));
    
    // Check for failed login attempts
    const recentFailedLogins = await prisma.user.findMany({
      where: {
        failedLoginAttempts: {
          gt: 0
        }
      },
      select: {
        email: true,
        failedLoginAttempts: true,
        lastLoginAttempt: true,
        accountLockedUntil: true
      }
    });
    
    if (recentFailedLogins.length > 0) {
      console.log(`\n⚠️  ${recentFailedLogins.length} accounts with failed login attempts:`);
      recentFailedLogins.slice(0, 5).forEach(user => {
        console.log(`  - ${user.email}: ${user.failedLoginAttempts} failed attempts`);
        if (user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date()) {
          console.log(`    🔒 Account locked until ${user.accountLockedUntil}`);
        }
      });
    } else {
      console.log('✅ No failed login attempts detected');
    }

    // 6. Performance Recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS');
    console.log('-'.repeat(80));
    
    const recommendations = [];
    
    if (dbLatency > 500) {
      recommendations.push('⚠️  Optimize database queries or upgrade database instance');
    }
    
    if (queryTime > 2000) {
      recommendations.push('⚠️  Add indexes to frequently queried fields (startTime, outcome, agentId)');
    }
    
    if (stuckCalls.length > 10) {
      recommendations.push('⚠️  Implement auto-cleanup job for stuck calls (no endTime > 1 hour old)');
    }
    
    if (callRecordCount > 100000) {
      recommendations.push('⚠️  Archive old call records (> 90 days) to separate table');
    }
    
    if (agentsWithStaleCall.length > 0) {
      recommendations.push('⚠️  Implement agent state cleanup on disconnect');
    }
    
    if (recommendations.length === 0) {
      console.log('✅ No critical performance issues detected');
      console.log('✅ System operating within normal parameters');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }

    // 7. Quick Performance Benchmarks
    console.log('\n⚡ PERFORMANCE BENCHMARKS');
    console.log('-'.repeat(80));
    
    // Test 1: Simple user query
    const test1Start = Date.now();
    await prisma.user.findFirst();
    const test1Time = Date.now() - test1Start;
    console.log(`Simple Query (findFirst): ${test1Time}ms ${test1Time < 50 ? '✅' : test1Time < 200 ? '⚠️' : '❌'}`);
    
    // Test 2: Complex call record aggregation
    const test2Start = Date.now();
    await prisma.callRecord.groupBy({
      by: ['outcome'],
      _count: true,
      where: {
        startTime: {
          gte: sevenDaysAgo
        }
      }
    });
    const test2Time = Date.now() - test2Start;
    console.log(`Aggregation Query (groupBy): ${test2Time}ms ${test2Time < 500 ? '✅' : test2Time < 2000 ? '⚠️' : '❌'}`);
    
    // Test 3: Join query (call with agent)
    const test3Start = Date.now();
    await prisma.callRecord.findMany({
      where: {
        startTime: {
          gte: sevenDaysAgo
        }
      },
      include: {
        agent: true,
        contact: true
      },
      take: 10
    });
    const test3Time = Date.now() - test3Start;
    console.log(`Join Query (with relations): ${test3Time}ms ${test3Time < 200 ? '✅' : test3Time < 1000 ? '⚠️' : '❌'}`);

    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    
    const overallHealth = 
      dbLatency < 500 && 
      queryTime < 2000 && 
      stuckCalls.length < 10 && 
      test1Time < 200 && 
      test2Time < 2000 && 
      test3Time < 1000;
    
    if (overallHealth) {
      console.log('✅ SYSTEM HEALTH: EXCELLENT');
      console.log('✅ No critical issues detected');
      console.log('✅ All performance metrics within acceptable range');
    } else {
      console.log('⚠️  SYSTEM HEALTH: NEEDS ATTENTION');
      console.log('⚠️  Some performance issues detected - review recommendations above');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`Analysis completed at ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR during analysis:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeSystemPerformance().catch(console.error);
