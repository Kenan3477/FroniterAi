const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTranscriptionJobs() {
  try {
    console.log('🔍 Checking current transcription job statuses...');
    
    // Get all transcription jobs that are stuck in 'retrying' status
    const stuckJobs = await prisma.transcriptionJob.findMany({
      where: {
        status: 'retrying'
      },
      include: {
        callRecord: {
          include: {
            recordingFiles: true
          }
        }
      }
    });
    
    console.log(`Found ${stuckJobs.length} stuck transcription jobs`);
    
    for (const job of stuckJobs) {
      const recordingFile = job.callRecord.recordingFiles[0];
      
      if (recordingFile && recordingFile.recordingUrl) {
        console.log(`✅ Restarting transcription for call ${job.callRecord.id} - has recording URL`);
        
        // Reset the job to 'pending' so it will be picked up by the transcription service
        await prisma.transcriptionJob.update({
          where: { id: job.id },
          data: {
            status: 'pending',
            attempts: 0,
            lastAttemptAt: null,
            errorMessage: null,
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ Reset transcription job ${job.id} to pending`);
      } else {
        console.log(`❌ Call ${job.callRecord.id} still missing recording URL - keeping as retrying`);
      }
    }
    
    console.log('\n🔍 Summary of transcription job statuses:');
    const statusCounts = await prisma.transcriptionJob.groupBy({
      by: ['status'],
      _count: true
    });
    
    statusCounts.forEach(status => {
      console.log(`${status.status}: ${status._count} jobs`);
    });
    
    console.log('\n✅ Transcription job fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing transcription jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTranscriptionJobs();