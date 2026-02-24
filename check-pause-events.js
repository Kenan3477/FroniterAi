const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://zenan:@localhost:5432/omnivox_dev"
});

async function checkPauseEvents() {
  try {
    console.log('🔍 Checking pause events in database...');
    
    // Get all pause events
    const pauseEvents = await prisma.pauseEvent.findMany({
      include: {
        agent: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Total pause events in database: ${pauseEvents.length}`);
    
    if (pauseEvents.length === 0) {
      console.log('❌ No pause events found in database');
      
      // Check if the table exists and show schema
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'pause_events'
        ORDER BY ordinal_position;
      `;
      
      console.log('📋 pause_events table schema:');
      console.table(result);
      
    } else {
      console.log('✅ Found pause events:');
      pauseEvents.forEach((event, index) => {
        console.log(`\n${index + 1}. Event ID: ${event.id}`);
        console.log(`   Agent: ${event.agent?.firstName} ${event.agent?.lastName} (${event.agent?.username})`);
        console.log(`   Type: ${event.eventType}`);
        console.log(`   Reason: ${event.pauseReason}`);
        console.log(`   Category: ${event.pauseCategory || 'N/A'}`);
        console.log(`   Start: ${event.startTime}`);
        console.log(`   End: ${event.endTime || 'Still active'}`);
        console.log(`   Duration: ${event.duration || 'N/A'} seconds`);
        console.log(`   Created: ${event.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking pause events:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPauseEvents();