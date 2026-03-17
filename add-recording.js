const { PrismaClient } = require('@prisma/client');

async function addRecordingToCall() {
  const prisma = new PrismaClient({
    datasources: { 
      db: { url: 'postgresql://zenan:@localhost:5432/omnivox_dev' }
    }
  });
  
  try {
    console.log('🔧 Adding demo recording URL to your test call...');
    
    // Use a public demo audio file for testing
    const demoRecordingUrl = 'https://file-examples.com/storage/fef30a16c5e27b38c74b7e1/2017/11/file_example_WAV_1MG.wav';
    
    const updatedCall = await prisma.callRecord.update({
      where: { id: 'cmlp65bce000amhihg98wkc0e' },
      data: {
        recording: demoRecordingUrl
      }
    });
    
    console.log('✅ Updated call with recording URL:');
    console.log(`   Call ID: ${updatedCall.id}`);
    console.log(`   Recording: ${updatedCall.recording}`);
    console.log(`\n🎯 Now try the AI transcription again with this call!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addRecordingToCall();