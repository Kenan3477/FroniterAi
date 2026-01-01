const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedInboundQueues() {
  console.log('🌱 Seeding inbound queues...');

  const defaultQueues = [
    {
      name: 'dac_c',
      displayName: 'DAC (C)',
      description: 'Direct Access Centre - Customer Support',
      isActive: true,
      priority: 5,
      assignedAgents: JSON.stringify(['ext_001', 'ext_002']),
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
      maxWaitTime: 300
    },
    {
      name: 'customer_service',
      displayName: 'Customer Service',
      description: 'General customer service inquiries and support',
      isActive: true,
      priority: 4,
      assignedAgents: JSON.stringify(['ext_003', 'ext_004', 'ext_005']),
      businessHoursEnabled: true,
      businessHoursStart: '08:00',
      businessHoursEnd: '18:00',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: 'Europe/London',
      maxQueueSize: 75,
      overflowAction: 'voicemail',
      outOfHoursAction: 'voicemail',
      ringStrategy: 'longest_idle',
      callTimeout: 25,
      maxWaitTime: 240
    },
    {
      name: 'sales',
      displayName: 'Sales',
      description: 'Sales inquiries and new business opportunities',
      isActive: true,
      priority: 3,
      assignedAgents: JSON.stringify(['ext_006', 'ext_007']),
      businessHoursEnabled: true,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:30',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: 'Europe/London',
      maxQueueSize: 30,
      overflowAction: 'voicemail',
      outOfHoursAction: 'voicemail',
      ringStrategy: 'round_robin',
      callTimeout: 35,
      maxWaitTime: 180
    },
    {
      name: 'support',
      displayName: 'Support',
      description: 'Technical support and troubleshooting',
      isActive: true,
      priority: 4,
      assignedAgents: JSON.stringify(['ext_008', 'ext_009', 'ext_010']),
      businessHoursEnabled: true,
      businessHoursStart: '08:00',
      businessHoursEnd: '20:00',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
      timezone: 'Europe/London',
      maxQueueSize: 60,
      overflowAction: 'voicemail',
      outOfHoursAction: 'voicemail',
      ringStrategy: 'round_robin',
      callTimeout: 40,
      maxWaitTime: 420
    },
    {
      name: 'general_inquiry',
      displayName: 'General Inquiry',
      description: 'General inquiries and information requests',
      isActive: true,
      priority: 2,
      assignedAgents: JSON.stringify(['ext_011', 'ext_012']),
      businessHoursEnabled: true,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: 'Europe/London',
      maxQueueSize: 40,
      overflowAction: 'voicemail',
      outOfHoursAction: 'voicemail',
      ringStrategy: 'round_robin',
      callTimeout: 30,
      maxWaitTime: 300
    }
  ];

  for (const queueData of defaultQueues) {
    try {
      // Check if queue already exists
      const existingQueue = await prisma.inboundQueue.findUnique({
        where: { name: queueData.name }
      });

      if (existingQueue) {
        console.log(`⏭️ Queue ${queueData.displayName} already exists, skipping...`);
        continue;
      }

      // Create the queue
      await prisma.inboundQueue.create({
        data: queueData
      });

      console.log(`✅ Created queue: ${queueData.displayName}`);
    } catch (error) {
      console.error(`❌ Error creating queue ${queueData.displayName}:`, error);
    }
  }

  console.log('🌱 Inbound queues seeding completed!');
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedInboundQueues()
    .catch((error) => {
      console.error('Error seeding inbound queues:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedInboundQueues };