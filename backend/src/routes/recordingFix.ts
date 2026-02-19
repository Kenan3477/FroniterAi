import { Router } from 'express';
import { prisma } from '../database/index';
import { authenticate } from '../middleware/auth';

const router = Router();

// Admin endpoint to fix recording mappings and create test data
router.post('/fix-recordings', authenticate, async (req, res) => {
  try {
    console.log('🔧 Admin: Fixing recording mappings and creating test data...');
    
    // Step 1: Fix the existing recording with correct file path
    const existingRecord = await prisma.recording.findFirst({
      where: { id: 'cmlp67yhn000cmhih4hmhzm8r' }
    });
    
    if (existingRecord) {
      console.log('📝 Updating existing recording with correct file path...');
      await prisma.recording.update({
        where: { id: 'cmlp67yhn000cmhih4hmhzm8r' },
        data: {
          filePath: '/app/recordings/CA223b31bd3d82b81f2869e724936e2ad1_2026-02-16T12-49-00-182Z.mp3',
          fileName: 'CA223b31bd3d82b81f2869e724936e2ad1_2026-02-16T12-49-00-182Z.mp3',
          uploadStatus: 'completed'
        }
      });
      console.log('✅ Existing recording fixed');
    }
    
    // Step 2: Create additional test call records with recordings
    console.log('📞 Creating additional test call records...');
    
    const testCalls = [
      {
        id: 'test_call_real',
        customerPhone: '+1234567890',
        callType: 'outbound',
        duration: 35,
        recordingFileName: 'CA223b31bd3d82b81f2869e724936e2ad1_2026-02-16T12-49-00-182Z.mp3'
      },
      {
        id: 'test_call_demo_1', 
        customerPhone: '+1987654321',
        callType: 'inbound',
        duration: 22,
        recordingFileName: 'demo_recording_2.mp3'
      },
      {
        id: 'test_call_demo_2',
        customerPhone: '+1555123456',
        callType: 'outbound', 
        duration: 45,
        recordingFileName: 'demo_recording_3.mp3'
      }
    ];
    
    let createdCount = 0;
    
    for (const call of testCalls) {
      try {
        // Check if call record already exists
        const existingCall = await prisma.callRecord.findFirst({
          where: { id: call.id }
        });
        
        if (!existingCall) {
          // Create call record
          const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last week
          const endTime = new Date(startTime.getTime() + call.duration * 1000);
          
          // Get first available contact and campaign for the call record
          const firstContact = await prisma.contact.findFirst();
          const firstCampaign = await prisma.campaign.findFirst();
          
          if (!firstContact || !firstCampaign) {
            console.log('❌ No contact or campaign found, skipping test call creation');
            continue;
          }
          
          const callRecord = await prisma.callRecord.create({
            data: {
              id: call.id,
              callId: `call_${call.id}`,
              campaignId: firstCampaign.campaignId,
              contactId: firstContact.contactId,
              agentId: '1', // Admin user ID as string
              phoneNumber: call.customerPhone,
              callType: call.callType,
              startTime,
              endTime,
              duration: call.duration,
              outcome: 'answered'
            }
          });
          
          // Create recording
          await prisma.recording.create({
            data: {
              id: `recording_${call.id}`,
              callRecordId: call.id,
              fileName: call.recordingFileName,
              filePath: `/app/recordings/${call.recordingFileName}`,
              uploadStatus: 'completed'
            }
          });
          
          createdCount++;
          console.log(`✅ Created call record: ${call.id} with recording`);
        } else {
          console.log(`⚠️  Call record ${call.id} already exists`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error creating call ${call.id}:`, errorMessage);
      }
    }
    
    // Step 3: Get final count
    const totalCallRecords = await prisma.callRecord.count();
    const totalRecordings = await prisma.recording.count();
    
    console.log(`📊 Final counts: ${totalCallRecords} call records, ${totalRecordings} recordings`);
    
    res.json({
      success: true,
      message: 'Recording system fixed successfully',
      data: {
        existingRecordFixed: !!existingRecord,
        newRecordsCreated: createdCount,
        totalCallRecords,
        totalRecordings
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fixing recordings:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to fix recordings',
      message: errorMessage
    });
  }
});

// Admin endpoint to get current recording status
router.get('/recording-status', authenticate, async (req, res) => {
  try {
    console.log('📊 Admin: Getting recording system status...');
    
    const callRecords = await prisma.callRecord.findMany({
      include: {
        recordingFile: true
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });
    
    const recordingStats = {
      totalCallRecords: await prisma.callRecord.count(),
      totalRecordings: await prisma.recording.count(),
      recordsWithRecordings: callRecords.filter(r => r.recordingFile).length,
      recentRecords: callRecords.map(record => ({
        id: record.id,
        phoneNumber: record.phoneNumber,
        duration: record.duration,
        callType: record.callType,
        hasRecording: !!record.recordingFile,
        recordingFileName: record.recordingFile?.fileName || null,
        recordingPath: record.recordingFile?.filePath || null
      }))
    };
    
    res.json({
      success: true,
      data: recordingStats
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error getting recording status:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to get recording status',
      message: errorMessage
    });
  }
});

export { router as recordingFixRoutes };