#!/usr/bin/env node

/**
 * Restore Inbound Numbers and Queues
 * This script restores the inbound functionality that was accidentally dropped
 */

const { PrismaClient } = require('@prisma/client');

async function restoreInboundData() {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('📞 Restoring inbound numbers and queues...\n');

    // Restore the main Twilio inbound number
    console.log('📞 Creating inbound number...');
    try {
      const inboundNumber = await prisma.inboundNumber.create({
        data: {
          phoneNumber: '+442046343130',
          displayName: 'UK Local - London',
          country: 'GB',
          region: 'London',
          numberType: 'LOCAL',
          provider: 'TWILIO',
          capabilities: JSON.stringify(['VOICE', 'SMS']),
          isActive: true
        }
      });
      console.log('✅ Created inbound number:', inboundNumber.phoneNumber);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('📝 Inbound number already exists');
      } else {
        console.error('❌ Error creating inbound number:', error.message);
      }
    }

    // Create a default inbound queue
    console.log('\n📋 Creating default inbound queue...');
    try {
      const inboundQueue = await prisma.inboundQueue.create({
        data: {
          name: 'default-queue',
          displayName: 'Default Inbound Queue',
          description: 'Default queue for all inbound calls',
          isActive: true,
          businessHoursEnabled: true,
          businessHoursStart: '09:00',
          businessHoursEnd: '17:00',
          businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
          timezone: 'Europe/London',
          maxQueueSize: 50,
          overflowAction: 'voicemail',
          outOfHoursAction: 'voicemail',
          ringStrategy: 'round_robin',
          callTimeout: 30,
          maxWaitTime: 300,
          priority: 1
        }
      });
      console.log('✅ Created default inbound queue:', inboundQueue.name);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('📝 Default inbound queue already exists');
      } else {
        console.error('❌ Error creating default queue:', error.message);
      }
    }

    // Create a support queue
    console.log('\n📋 Creating support queue...');
    try {
      const supportQueue = await prisma.inboundQueue.create({
        data: {
          name: 'support-queue',
          displayName: 'Customer Support',
          description: 'Queue for customer support calls',
          isActive: true,
          businessHoursEnabled: true,
          businessHoursStart: '08:00',
          businessHoursEnd: '18:00',
          businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
          timezone: 'Europe/London',
          maxQueueSize: 100,
          overflowAction: 'voicemail',
          outOfHoursAction: 'voicemail',
          ringStrategy: 'round_robin',
          callTimeout: 20,
          maxWaitTime: 600,
          priority: 2
        }
      });
      console.log('✅ Created support queue:', supportQueue.name);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('📝 Support queue already exists');
      } else {
        console.error('❌ Error creating support queue:', error.message);
      }
    }

    console.log('\n🎉 Inbound data restoration completed!');

    // Verify the restoration
    console.log('\n📊 Verification:');
    
    const numbers = await prisma.inboundNumber.findMany();
    console.log(`  - Inbound numbers: ${numbers.length}`);
    numbers.forEach(num => {
      console.log(`    * ${num.phoneNumber} (${num.displayName}) - ${num.isActive ? 'Active' : 'Inactive'}`);
    });

    const queues = await prisma.inboundQueue.findMany();
    console.log(`  - Inbound queues: ${queues.length}`);
    queues.forEach(queue => {
      console.log(`    * ${queue.name} (${queue.displayName}) - ${queue.isActive ? 'Active' : 'Inactive'}`);
    });

  } catch (error) {
    console.error('❌ Error during restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
restoreInboundData().catch(console.error);