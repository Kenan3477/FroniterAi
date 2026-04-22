/**
 * Backfill Missing Call Recordings
 * 
 * This script fetches recordings from Twilio for calls that don't have
 * recording URLs in the database, with special focus on Sale Made calls.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function backfillRecordings() {
  console.log('🎙️  BACKFILLING MISSING CALL RECORDINGS\n');
  console.log('='.repeat(80));
  
  try {
    // Find Sale Made disposition
    const saleDisposition = await prisma.disposition.findFirst({
      where: {
        OR: [
          { name: { contains: 'Sale', mode: 'insensitive' } },
          { name: { contains: 'Sold', mode: 'insensitive' } }
        ]
      }
    });
    
    let saleDispositionId = saleDisposition?.id;
    console.log(`\n🎯 Sale Disposition: ${saleDisposition ? `"${saleDisposition.name}" (ID: ${saleDisposition.id})` : 'NOT FOUND'}`);
    
    // Get calls without recordings (prioritize Sale Made)
    const callsNeedingRecordings = await prisma.callRecord.findMany({
      where: {
        AND: [
          {
            OR: [
              { recording: null },
              { AND: [
                { recording: { not: null } },
                { recording: { not: { contains: 'twilio.com' } } }
              ]}
            ]
          },
          { startTime: { not: null } },
          { duration: { gt: 5 } } // Only calls longer than 5 seconds
        ]
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        recording: true,
        duration: true,
        startTime: true,
        dispositionId: true,
        disposition: {
          select: { name: true }
        }
      },
      orderBy: [
        { dispositionId: 'desc' }, // Prioritize calls with dispositions
        { startTime: 'desc' }
      ],
      take: 100
    });
    
    console.log(`\n📞 Found ${callsNeedingRecordings.length} calls without recording URLs`);
    
    // Separate Sale Made calls
    const saleCalls = callsNeedingRecordings.filter(c => c.dispositionId === saleDispositionId);
    const otherCalls = callsNeedingRecordings.filter(c => c.dispositionId !== saleDispositionId);
    
    console.log(`   💰 Sale Made calls: ${saleCalls.length}`);
    console.log(`   📱 Other calls: ${otherCalls.length}`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    // Process Sale Made calls first (highest priority)
    console.log(`\n🔍 Processing Sale Made calls first...\n`);
    
    for (const call of saleCalls) {
      try {
        console.log(`📞 Checking ${call.phoneNumber || 'Unknown'} (${call.callId})...`);
        
        // Try to fetch recordings from Twilio
        const recordings = await twilioClient.recordings.list({
          callSid: call.callId,
          limit: 10
        });
        
        if (recordings && recordings.length > 0) {
          const recording = recordings[0]; // Get most recent
          const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '')}`;
          
          // Update database
          await prisma.callRecord.update({
            where: { id: call.id },
            data: { recording: recordingUrl }
          });
          
          console.log(`   ✅ FOUND & UPDATED: ${recordingUrl}`);
          updatedCount++;
        } else {
          console.log(`   ⚠️  No recording found in Twilio`);
          notFoundCount++;
        }
        
        // Rate limit: 1 request per 100ms
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }
    
    // Process other calls
    if (otherCalls.length > 0) {
      console.log(`\n🔍 Processing other calls (top 20)...\n`);
      
      for (const call of otherCalls.slice(0, 20)) {
        try {
          console.log(`📞 Checking ${call.phoneNumber || 'Unknown'} (${call.disposition?.name || 'No disposition'})...`);
          
          const recordings = await twilioClient.recordings.list({
            callSid: call.callId,
            limit: 10
          });
          
          if (recordings && recordings.length > 0) {
            const recording = recordings[0];
            const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '')}`;
            
            await prisma.callRecord.update({
              where: { id: call.id },
              data: { recording: recordingUrl }
            });
            
            console.log(`   ✅ FOUND & UPDATED: ${recordingUrl}`);
            updatedCount++;
          } else {
            console.log(`   ⚠️  No recording found`);
            notFoundCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 BACKFILL SUMMARY:\n');
    console.log(`Calls Processed:     ${updatedCount + notFoundCount + errorCount}`);
    console.log(`✅ Updated:          ${updatedCount}`);
    console.log(`⚠️  Not Found:       ${notFoundCount}`);
    console.log(`❌ Errors:           ${errorCount}`);
    
    // Verify Sale Made calls now
    if (saleDispositionId) {
      const salesWithRecordings = await prisma.callRecord.count({
        where: {
          dispositionId: saleDispositionId,
          recording: { contains: 'twilio.com' }
        }
      });
      
      const totalSales = await prisma.callRecord.count({
        where: { dispositionId: saleDispositionId }
      });
      
      console.log(`\n💰 Sale Made Recording Coverage:`);
      console.log(`   Total Sales: ${totalSales}`);
      console.log(`   With Recordings: ${salesWithRecordings}`);
      console.log(`   Coverage: ${Math.round(salesWithRecordings/totalSales*100)}%`);
    }
    
    console.log('\n✅ Backfill complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check environment variables
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error('❌ Missing Twilio credentials in environment variables');
  console.error('   Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
  process.exit(1);
}

backfillRecordings();
