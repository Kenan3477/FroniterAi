/**
 * Call Recording Diagnostic Script
 * 
 * Investigates why call recordings show as "no recording"
 * Checks:
 * 1. Database call_records table for recording URLs
 * 2. Twilio API for actual recording status
 * 3. Sync status between Twilio and database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

async function diagnoseCallRecordings() {
  console.log('\n🔍 CALL RECORDING DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Step 1: Check database for call records
    console.log('Step 1: Checking database call records...\n');
    
    const callRecords = await prisma.callRecord.findMany({
      take: 20,
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        callId: true,
        recording: true,
        startTime: true,
        endTime: true,
        duration: true,
        outcome: true,
        phoneNumber: true,
        dialedNumber: true,
        agent: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`📊 Found ${callRecords.length} recent call records\n`);

    if (callRecords.length === 0) {
      console.log('⚠️  No call records found in database');
      console.log('   Make some calls first to test recordings\n');
      return;
    }

    // Analyze recording data
    let withRecording = 0;
    let withoutRecording = 0;
    let completedCalls = 0;

    console.log('📋 CALL RECORDS ANALYSIS:');
    console.log('─────────────────────────────────────────────────\n');

    callRecords.forEach((call, index) => {
      const hasRecording = !!call.recording;
      const isCompleted = call.outcome === 'completed' || call.outcome === 'CONNECTED' || call.duration > 0;

      if (isCompleted) completedCalls++;
      if (hasRecording) withRecording++;
      if (!hasRecording) withoutRecording++;

      console.log(`Call #${index + 1}:`);
      console.log(`  ID:              ${call.id}`);
      console.log(`  Call ID:         ${call.callId || 'MISSING ❌'}`);
      console.log(`  Recording:       ${hasRecording ? '✅ Present' : '❌ Missing'}`);
      if (hasRecording) {
        console.log(`                   ${call.recording}`);
      }
      console.log(`  Start Time:      ${call.startTime?.toISOString() || 'N/A'}`);
      console.log(`  Duration:        ${call.duration || 0}s`);
      console.log(`  Outcome:         ${call.outcome || 'Unknown'}`);
      console.log(`  Phone:           ${call.phoneNumber || 'N/A'}`);
      console.log(`  Dialed:          ${call.dialedNumber || 'N/A'}`);
      console.log(`  Agent:           ${call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : 'N/A'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('📊 SUMMARY STATISTICS:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Total Calls:              ${callRecords.length}`);
    console.log(`Completed Calls:          ${completedCalls}`);
    console.log(`With Recording:           ${withRecording} (${((withRecording/callRecords.length)*100).toFixed(1)}%)`);
    console.log(`Without Recording:        ${withoutRecording} (${((withoutRecording/callRecords.length)*100).toFixed(1)}%)`);
    console.log('');

    // Step 2: Sample some recording URLs
    console.log('\nStep 2: Analyzing recording URLs...\n');

    const callsWithRecording = callRecords.filter(c => c.recording);
    
    if (callsWithRecording.length > 0) {
      console.log(`Found ${callsWithRecording.length} calls with recording URLs:\n`);
      
      callsWithRecording.slice(0, 3).forEach((call, idx) => {
        console.log(`Recording #${idx + 1}:`);
        console.log(`  Call ID:  ${call.callId}`);
        console.log(`  URL:      ${call.recording}`);
        console.log(`  Duration: ${call.duration}s`);
        console.log('');
      });
    } else {
      console.log('⚠️  No recording URLs found in database\n');
    }

    // Step 3: Diagnose the issue
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSIS:');
    console.log('─────────────────────────────────────────────────\n');

    if (withoutRecording === callRecords.length) {
      console.log('❌ CRITICAL: NO recordings found in database');
      console.log('\nPossible causes:');
      console.log('1. Recording callback webhook not configured');
      console.log('2. Recording sync endpoint not being called');
      console.log('3. Database not being updated with recording URLs');
      console.log('4. TwiML not including <Record> instruction\n');
      
      console.log('Solutions:');
      console.log('✅ Check TwiML includes: <Record recordingStatusCallback="..." />');
      console.log('✅ Verify webhook endpoint: /api/twilio/recording-callback');
      console.log('✅ Check recording sync service is running');
      console.log('✅ Review backend logs for recording webhook errors\n');
    } else if (withRecording < completedCalls * 0.8) {
      console.log('⚠️  WARNING: Many completed calls missing recordings');
      console.log(`   Expected ~${completedCalls} recordings, found ${withRecording}`);
      console.log('\nPossible causes:');
      console.log('1. Recording sync is delayed (Twilio can take 1-2 minutes)');
      console.log('2. Some webhooks are failing');
      console.log('3. Database updates are not completing\n');
    } else {
      console.log('✅ Recording data looks good!');
      console.log(`   ${withRecording} out of ${completedCalls} completed calls have recordings\n`);
    }

    // Step 4: Check for frontend display issues
    console.log('═══════════════════════════════════════════════════');
    console.log('🖥️  FRONTEND DISPLAY CHECK:');
    console.log('─────────────────────────────────────────────────\n');

    console.log('Common frontend issues:');
    console.log('1. Component checks for wrong field name (recordingUrl vs recording)');
    console.log('2. NULL values not handled properly');
    console.log('3. Recording URL not being passed from API to component');
    console.log('4. Audio player component not rendering\n');

    console.log('Check these files:');
    console.log('- frontend/src/components/call-history/ (call history components)');
    console.log('- backend/src/routes/callRecords.ts (API response)');
    console.log('- Look for: recording field in API responses\n');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseCallRecordings();
