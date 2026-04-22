/**
 * Check Recording Coverage - Analyze which calls have recordings
 * Focus on Sale Made dispositions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeRecordingCoverage() {
  console.log('📊 CALL RECORDING COVERAGE ANALYSIS\n');
  console.log('='.repeat(80));
  
  try {
    // Get all calls
    const totalCalls = await prisma.callRecord.count();
    console.log(`\n📞 Total Call Records: ${totalCalls}`);
    
    // Get calls with recordings
    const callsWithRecordings = await prisma.callRecord.count({
      where: {
        recording: { not: null }
      }
    });
    console.log(`📼 Calls with recording field: ${callsWithRecordings}`);
    
    // Get calls with recording URLs (actual recordings)
    const callsWithRecordingUrls = await prisma.callRecord.count({
      where: {
        AND: [
          { recording: { not: null } },
          { recording: { contains: 'twilio.com' } }
        ]
      }
    });
    console.log(`✅ Calls with Twilio recording URLs: ${callsWithRecordingUrls}`);
    
    // Check for Sale Made disposition
    const saleDisposition = await prisma.disposition.findFirst({
      where: {
        OR: [
          { name: { contains: 'Sale', mode: 'insensitive' } },
          { name: { contains: 'Sold', mode: 'insensitive' } }
        ]
      }
    });
    
    if (saleDisposition) {
      console.log(`\n🎯 Sale Disposition Found: "${saleDisposition.name}" (ID: ${saleDisposition.id})`);
      
      // Get all Sale Made calls
      const saleCalls = await prisma.callRecord.findMany({
        where: {
          dispositionId: saleDisposition.id
        },
        select: {
          id: true,
          callId: true,
          phoneNumber: true,
          recording: true,
          duration: true,
          startTime: true,
          outcome: true
        },
        orderBy: { startTime: 'desc' },
        take: 50
      });
      
      console.log(`\n💰 Sale Made Calls: ${saleCalls.length}`);
      
      const salesWithRecordings = saleCalls.filter(c => c.recording && c.recording.includes('twilio.com'));
      const salesWithoutRecordings = saleCalls.filter(c => !c.recording || !c.recording.includes('twilio.com'));
      
      console.log(`   ✅ With recordings: ${salesWithRecordings.length}`);
      console.log(`   ❌ Without recordings: ${salesWithoutRecordings.length}`);
      
      if (salesWithoutRecordings.length > 0) {
        console.log(`\n⚠️  SALE CALLS WITHOUT RECORDINGS:\n`);
        salesWithoutRecordings.slice(0, 10).forEach(call => {
          console.log(`   📞 ${call.phoneNumber || 'Unknown'}`);
          console.log(`      Call ID: ${call.callId}`);
          console.log(`      Recording: ${call.recording || 'NULL'}`);
          console.log(`      Duration: ${call.duration}s`);
          console.log(`      Date: ${call.startTime ? new Date(call.startTime).toLocaleString() : 'Unknown'}`);
          console.log('');
        });
      }
    }
    
    // Check recent calls without recordings
    const recentCallsNoRecording = await prisma.callRecord.findMany({
      where: {
        startTime: { not: null },
        duration: { gt: 10 }, // Calls longer than 10 seconds
        OR: [
          { recording: null },
          { recording: { not: { contains: 'twilio.com' } } }
        ]
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        recording: true,
        duration: true,
        startTime: true,
        disposition: {
          select: { name: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 20
    });
    
    console.log(`\n⚠️  Recent Calls (>10s) WITHOUT Recordings: ${recentCallsNoRecording.length}`);
    if (recentCallsNoRecording.length > 0) {
      console.log('\nSample:');
      recentCallsNoRecording.slice(0, 5).forEach(call => {
        console.log(`   📞 ${call.phoneNumber || 'Unknown'} - ${call.duration}s - ${call.disposition?.name || 'No disposition'}`);
        console.log(`      Call ID: ${call.callId}`);
        console.log(`      Recording: ${call.recording || 'NULL'}`);
        console.log('');
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY:\n');
    console.log(`Total Calls:              ${totalCalls}`);
    console.log(`With Recording Field:     ${callsWithRecordings} (${Math.round(callsWithRecordings/totalCalls*100)}%)`);
    console.log(`With Recording URLs:      ${callsWithRecordingUrls} (${Math.round(callsWithRecordingUrls/totalCalls*100)}%)`);
    console.log(`Missing Recordings:       ${totalCalls - callsWithRecordingUrls} (${Math.round((totalCalls-callsWithRecordingUrls)/totalCalls*100)}%)`);
    
    console.log('\n🔍 RECOMMENDATIONS:\n');
    if (totalCalls - callsWithRecordingUrls > 0) {
      console.log('1. ✅ Check if recording is enabled in Twilio call parameters');
      console.log('2. ✅ Verify recording callback webhook is configured');
      console.log('3. ✅ Ensure recording status callback handler is working');
      console.log('4. ✅ Check for Sale Made calls specifically without recordings');
    } else {
      console.log('✅ All calls have recordings! Great job!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRecordingCoverage();
