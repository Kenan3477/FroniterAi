#!/usr/bin/env node
/**
 * Test Inbound Number Configuration Persistence
 * 
 * This script verifies that inbound number configuration settings
 * are properly saved to the database and persist across reloads.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConfigurationPersistence() {
  console.log('🧪 Testing Inbound Number Configuration Persistence\n');
  console.log('='.repeat(60));

  try {
    // Find an inbound number
    const inboundNumbers = await prisma.inboundNumber.findMany({
      where: { isActive: true },
      take: 1
    });

    if (inboundNumbers.length === 0) {
      console.log('❌ No active inbound numbers found');
      return;
    }

    const number = inboundNumbers[0];
    console.log(`\n📞 Testing with: ${number.phoneNumber} (${number.displayName})`);
    console.log(`   ID: ${number.id}\n`);

    // Display current configuration
    console.log('📋 CURRENT CONFIGURATION:');
    console.log('─'.repeat(60));
    console.log(`Business Hours:           ${number.businessHours || 'not set'}`);
    console.log(`Business Hours Start:     ${number.businessHoursStart || 'not set'}`);
    console.log(`Business Hours End:       ${number.businessHoursEnd || 'not set'}`);
    console.log(`Business Days:            ${number.businessDays || 'not set'}`);
    console.log(`Out of Hours Action:      ${number.outOfHoursAction || 'not set'}`);
    console.log(`Route To:                 ${number.routeTo || 'not set'}`);
    console.log(`Selected Queue ID:        ${number.selectedQueueId || 'not set'}`);
    console.log(`Selected Flow ID:         ${number.selectedFlowId || 'not set'}`);
    console.log(`Record Calls:             ${number.recordCalls !== null ? number.recordCalls : 'not set'}`);
    console.log(`Auto Reject Anonymous:    ${number.autoRejectAnonymous !== null ? number.autoRejectAnonymous : 'not set'}`);
    console.log('\n📁 AUDIO FILES:');
    console.log('─'.repeat(60));
    console.log(`Greeting Audio:           ${number.greetingAudioUrl || 'not set'}`);
    console.log(`Out of Hours Audio:       ${number.outOfHoursAudioUrl || 'not set'}`);
    console.log(`Voicemail Audio:          ${number.voicemailAudioUrl || 'not set'}`);
    console.log(`No Answer Audio:          ${number.noAnswerAudioUrl || 'not set'}`);
    console.log(`Busy Audio:               ${number.busyAudioUrl || 'not set'}`);

    // Check if configuration is complete
    console.log('\n✅ CONFIGURATION CHECKLIST:');
    console.log('─'.repeat(60));
    
    const checks = [
      { name: 'Business Hours Set', value: !!number.businessHours },
      { name: 'Business Hours Times', value: !!(number.businessHoursStart && number.businessHoursEnd) },
      { name: 'Out of Hours Action', value: !!number.outOfHoursAction },
      { name: 'Route To Set', value: !!number.routeTo },
      { name: 'Greeting Audio Configured', value: !!number.greetingAudioUrl },
      { name: 'Recording Enabled', value: number.recordCalls === true }
    ];

    checks.forEach(check => {
      const icon = check.value ? '✅' : '⚠️';
      console.log(`${icon} ${check.name.padEnd(30)} ${check.value ? 'YES' : 'NO'}`);
    });

    // Check routing configuration
    console.log('\n🔀 ROUTING CONFIGURATION:');
    console.log('─'.repeat(60));
    
    if (number.routeTo === 'Queue') {
      if (number.selectedQueueId) {
        console.log('✅ Configured to route to queue:', number.selectedQueueId);
        
        // Try to find the queue
        const queue = await prisma.inboundQueue.findUnique({
          where: { id: number.selectedQueueId }
        });
        
        if (queue) {
          console.log(`   Queue Name: ${queue.name} (${queue.displayName})`);
          console.log(`   Queue Active: ${queue.isActive}`);
        } else {
          console.log('   ⚠️ WARNING: Selected queue not found in database!');
        }
      } else {
        console.log('⚠️ WARNING: Route to Queue selected but no queue ID set');
      }
    } else if (number.routeTo === 'Flow') {
      if (number.selectedFlowId || number.assignedFlowId) {
        const flowId = number.selectedFlowId || number.assignedFlowId;
        console.log('✅ Configured to route to flow:', flowId);
        
        // Try to find the flow
        const flow = await prisma.flow.findUnique({
          where: { id: flowId }
        });
        
        if (flow) {
          console.log(`   Flow Name: ${flow.name}`);
          console.log(`   Flow Status: ${flow.status}`);
        } else {
          console.log('   ⚠️ WARNING: Selected flow not found in database!');
        }
      } else {
        console.log('⚠️ WARNING: Route to Flow selected but no flow ID set');
      }
    } else {
      console.log(`📞 Configured for direct agent routing (${number.routeTo || 'default'})`);
    }

    // Check out of hours configuration
    console.log('\n🕒 OUT OF HOURS CONFIGURATION:');
    console.log('─'.repeat(60));
    
    if (number.outOfHoursAction === 'voicemail') {
      if (number.outOfHoursAudioUrl || number.voicemailAudioUrl) {
        console.log('✅ Voicemail configured with audio file');
        console.log(`   Audio URL: ${number.outOfHoursAudioUrl || number.voicemailAudioUrl}`);
      } else {
        console.log('⚠️ WARNING: Voicemail action selected but no audio file configured!');
        console.log('   This will cause calls to hang up silently (TTS disabled)');
      }
    } else if (number.outOfHoursAction === 'transfer') {
      if (number.outOfHoursTransferNumber) {
        console.log('✅ Transfer configured to:', number.outOfHoursTransferNumber);
      } else {
        console.log('⚠️ WARNING: Transfer action selected but no number set');
      }
    } else {
      console.log(`Action: ${number.outOfHoursAction || 'Hangup'}`);
      if (number.outOfHoursAudioUrl) {
        console.log(`Audio: ${number.outOfHoursAudioUrl}`);
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(60));
    
    const hasBasicConfig = !!(number.businessHours && number.outOfHoursAction && number.routeTo);
    const hasAudioFiles = !!(number.greetingAudioUrl);
    const hasRouting = !!(
      (number.routeTo === 'Queue' && number.selectedQueueId) ||
      (number.routeTo === 'Flow' && (number.selectedFlowId || number.assignedFlowId)) ||
      (number.routeTo !== 'Queue' && number.routeTo !== 'Flow')
    );

    console.log(`Basic Configuration:      ${hasBasicConfig ? '✅ Complete' : '⚠️ Incomplete'}`);
    console.log(`Audio Files:              ${hasAudioFiles ? '✅ Configured' : '⚠️ Missing'}`);
    console.log(`Routing:                  ${hasRouting ? '✅ Configured' : '⚠️ Incomplete'}`);
    console.log(`Recording:                ${number.recordCalls ? '✅ Enabled' : '❌ Disabled'}`);
    
    const isFullyConfigured = hasBasicConfig && hasAudioFiles && hasRouting;
    console.log(`\nOverall Status:           ${isFullyConfigured ? '✅ READY FOR PRODUCTION' : '⚠️ NEEDS CONFIGURATION'}`);

    if (!isFullyConfigured) {
      console.log('\n💡 RECOMMENDATIONS:');
      if (!hasBasicConfig) console.log('   - Configure business hours, out of hours action, and routing');
      if (!hasAudioFiles) console.log('   - Upload greeting audio file (required, TTS disabled)');
      if (!hasRouting) console.log('   - Complete routing configuration (select queue/flow)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete\n');

  } catch (error) {
    console.error('❌ Error testing configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConfigurationPersistence();
