#!/usr/bin/env node
/**
 * 🎙️ MANDATORY RECORDING ENFORCEMENT MONITOR
 * 
 * This script monitors call records to ensure ALL calls have recordings.
 * Runs as a cron job to detect and alert on missing recordings.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function monitorMandatoryRecordings() {
  console.log('🔍 MANDATORY RECORDING MONITOR - Starting check...\n');
  
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  try {
    // Find all completed calls from last 24 hours
    const completedCalls = await prisma.callRecord.findMany({
      where: {
        outcome: {
          in: ['completed', 'answered', 'no-answer', 'busy', 'failed']
        },
        createdAt: {
          gte: oneDayAgo
        },
        callType: 'outbound'
      },
      select: {
        callId: true,
        phoneNumber: true,
        outcome: true,
        recording: true,
        recordingUrl: true,
        duration: true,
        createdAt: true,
        notes: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total outbound calls (last 24h): ${completedCalls.length}\n`);

    // Categorize calls by recording status
    const withRecording = [];
    const withoutRecording = [];
    const answered = [];
    
    for (const call of completedCalls) {
      // Only check answered calls - unanswered calls won't have recordings
      if (call.outcome === 'completed' || call.outcome === 'answered') {
        answered.push(call);
        
        if (call.recordingUrl) {
          withRecording.push(call);
        } else {
          withoutRecording.push(call);
        }
      }
    }

    // Report findings
    console.log(`📞 Answered calls (should have recordings): ${answered.length}`);
    console.log(`✅ Calls WITH recordings: ${withRecording.length}`);
    console.log(`❌ Calls WITHOUT recordings: ${withoutRecording.length}\n`);

    // Calculate compliance rate
    const complianceRate = answered.length > 0 
      ? ((withRecording.length / answered.length) * 100).toFixed(2)
      : 100;

    console.log(`📊 RECORDING COMPLIANCE RATE: ${complianceRate}%\n`);

    // 🚨 ALERT if any answered calls are missing recordings
    if (withoutRecording.length > 0) {
      console.log('🚨 CRITICAL ALERT: CALLS WITHOUT RECORDINGS DETECTED!\n');
      
      withoutRecording.forEach((call, index) => {
        console.log(`❌ Call ${index + 1}:`);
        console.log(`   Call ID: ${call.callId}`);
        console.log(`   Phone: ${call.phoneNumber}`);
        console.log(`   Duration: ${call.duration}s`);
        console.log(`   Time: ${call.createdAt.toISOString()}`);
        console.log(`   Recording: ${call.recording || 'NONE'}`);
        console.log(`   Recording URL: ${call.recordingUrl || 'NONE'}`);
        console.log(`   Notes: ${call.notes?.substring(0, 100) || 'NONE'}\n`);
      });

      console.log('🔧 RECOMMENDED ACTIONS:');
      console.log('1. Check Twilio dashboard for these call SIDs');
      console.log('2. Verify recording callbacks are firing');
      console.log('3. Check backend logs for recording errors');
      console.log('4. Ensure BACKEND_URL environment variable is correct');
      console.log('5. Verify recording parameters in dialerController.ts\n');
      
      // Return non-zero exit code for alerting systems
      process.exit(1);
    } else {
      console.log('✅ SUCCESS: All answered calls have recordings!\n');
      console.log('🎙️ RECORDING SYSTEM STATUS: HEALTHY\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error monitoring recordings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run monitor
monitorMandatoryRecordings().catch(console.error);
