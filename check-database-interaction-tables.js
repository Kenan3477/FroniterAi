// Check database tables and interaction records
// Run this with Railway CLI or backend

import { prisma } from './backend/src/database/index.js';

async function checkDatabaseTables() {
  console.log('🔍 Checking database tables and interaction records...');
  
  try {
    // Check if interaction table exists by trying to count records
    try {
      const interactionCount = await prisma.interaction.count();
      console.log(`📊 Interaction table exists with ${interactionCount} records`);
      
      // If interactions exist, show a few sample records
      if (interactionCount > 0) {
        const sampleInteractions = await prisma.interaction.findMany({
          take: 3,
          orderBy: { startedAt: 'desc' },
          include: {
            agent: true,
            contact: true,
            campaign: true
          }
        });
        
        console.log('📋 Sample interaction records:');
        sampleInteractions.forEach((interaction, i) => {
          console.log(`${i+1}. Agent: ${interaction.agentId}, Contact: ${interaction.contactId}, Outcome: ${interaction.outcome}`);
        });
      }
      
    } catch (interactionError) {
      console.log('❌ Interaction table does not exist or has schema issues:', interactionError.message);
    }
    
    // Check CallRecord table (which dashboard uses)
    try {
      const callRecordCount = await prisma.callRecord.count({
        where: {
          createdAt: {
            gte: new Date('2026-02-27T00:00:00.000Z'),
            lte: new Date('2026-02-28T00:00:00.000Z')
          }
        }
      });
      
      console.log(`📞 CallRecord table has ${callRecordCount} records today`);
      
      if (callRecordCount > 0) {
        const sampleCalls = await prisma.callRecord.findMany({
          where: {
            createdAt: {
              gte: new Date('2026-02-27T00:00:00.000Z'),
              lte: new Date('2026-02-28T00:00:00.000Z')
            }
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            contact: true,
            campaign: true
          }
        });
        
        console.log('📞 Sample call records from today:');
        sampleCalls.forEach((call, i) => {
          console.log(`${i+1}. CallSid: ${call.callSid}`);
          console.log(`   Agent: ${call.agentId}`);
          console.log(`   Contact: ${call.contact?.firstName} ${call.contact?.lastName} (${call.contact?.phone})`);
          console.log(`   Outcome: ${call.outcome}`);
          console.log(`   Campaign: ${call.campaign?.name}`);
          console.log(`   Created: ${call.createdAt}`);
          console.log('   ---');
        });
      }
      
    } catch (callRecordError) {
      console.log('❌ CallRecord table error:', callRecordError.message);
    }
    
    // Check Task table for callbacks
    try {
      const taskCount = await prisma.task.count({
        where: { type: 'callback' }
      });
      console.log(`📋 Task table has ${taskCount} callback tasks`);
      
    } catch (taskError) {
      console.log('❌ Task table error:', taskError.message);
    }
    
  } catch (error) {
    console.error('❌ Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseTables();