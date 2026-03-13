require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkTranscriptData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking transcript data for call: cmlp65bce000amhihg98wkc0e\n');
    
    const transcripts = await prisma.callTranscript.findMany({
      where: {
        callId: 'cmlp65bce000amhihg98wkc0e'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${transcripts.length} transcripts:`);
    
    transcripts.forEach((transcript, index) => {
      console.log(`\n📝 Transcript ${index + 1}:`);
      console.log(`ID: ${transcript.id}`);
      console.log(`Provider: ${transcript.processingProvider}`);
      console.log(`Text: "${transcript.transcriptText}"`);
      console.log(`Structured Data:`, transcript.structuredJson ? 'YES' : 'NO');
      
      if (transcript.structuredJson) {
        console.log('📊 Structured JSON:');
        console.log(JSON.stringify(transcript.structuredJson, null, 2));
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTranscriptData();