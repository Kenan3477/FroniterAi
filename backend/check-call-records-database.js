require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkCallRecordsDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking call records database state...');
    
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if CallRecord table exists by trying to count
    const count = await prisma.callRecord.count();
    console.log(`✅ CallRecord table exists with ${count} total records`);
    
    // Check for records with recordings
    const withRecordings = await prisma.callRecord.count({
      where: {
        recording: {
          not: null
        }
      }
    });
    
    console.log(`🎵 Records with recording URLs: ${withRecordings}`);
    
    // Get sample records
    const sampleRecords = await prisma.callRecord.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        startTime: true,
        endTime: true,
        duration: true,
        outcome: true,
        recording: true,
        createdAt: true,
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log('📋 Sample call records:');
    console.log(JSON.stringify(sampleRecords, null, 2));
    
    // Check date range (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCount = await prisma.callRecord.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });
    
    console.log(`📅 Records in last 7 days: ${recentCount}`);
    
    // Check for different call types
    const callTypeStats = await prisma.callRecord.groupBy({
      by: ['callType'],
      _count: {
        _all: true
      }
    });
    
    console.log('📞 Call types breakdown:', callTypeStats);
    
    // Check for different outcomes
    const outcomeStats = await prisma.callRecord.groupBy({
      by: ['outcome'],
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          _all: 'desc'
        }
      }
    });
    
    console.log('📊 Outcome breakdown:', outcomeStats);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallRecordsDatabase();