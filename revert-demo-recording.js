#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertDemoRecording() {
  try {
    console.log('🔄 Reverting demo recording back to original...');

    // Find the recording that was changed to demo-1
    const recording = await prisma.recording.findFirst({
      where: {
        filePath: 'demo-1'
      },
      include: {
        callRecord: true
      }
    });

    if (recording) {
      console.log('📁 Found demo recording, reverting to original path...');
      
      // Revert back to the original file path
      await prisma.recording.update({
        where: { id: recording.id },
        data: {
          filePath: '/app/recordings/CA223b31bd3d82b81f2869e724936e2ad1_2026-02-16T12-49-00-182Z.mp3'
        }
      });

      console.log('✅ Reverted recording file path back to original');
      console.log(`Recording ID: ${recording.id}`);
      console.log(`Call ID: ${recording.callRecord?.callId}`);
    } else {
      console.log('⚠️ No demo recording found to revert');
    }

  } catch (error) {
    console.error('❌ Error reverting demo recording:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertDemoRecording();