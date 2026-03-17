// Import using the backend's Prisma instance
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPauseEvents() {
  try {
    console.log('🔍 Checking pause events in database...');
    
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
    
    console.log(`📊 Total pause events: ${pauseEvents.length}`);
    
    if (pauseEvents.length === 0) {
      console.log('❌ No pause events found');
      
      // Let's create a test pause event
      console.log('🧪 Creating a test pause event...');
      
      const testEvent = await prisma.pauseEvent.create({
        data: {
          agentId: 509, // Your user ID
          eventType: 'manual_pause',
          pauseReason: 'Toilet Break',
          pauseCategory: 'personal',
          startTime: new Date(),
          endTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes later
          duration: 300, // 5 minutes in seconds
          agentComment: 'Test pause event for debugging'
        }
      });
      
      console.log('✅ Created test pause event:', testEvent.id);
      
    } else {
      console.log('✅ Found pause events:');
      pauseEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.agent?.firstName} ${event.agent?.lastName}: ${event.pauseReason} (${event.duration}s)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPauseEvents();