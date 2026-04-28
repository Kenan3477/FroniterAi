/**
 * Diagnostic Script: Check Recording File Paths
 * 
 * This script checks what's stored in recording.filePath to diagnose download issues
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecordingPaths() {
  console.log('🔍 Checking recording file paths in database...\n');
  
  try {
    // Get recent recordings with their call records
    const recordings = await prisma.recording.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        callRecord: {
          select: {
            phoneNumber: true,
            startTime: true,
            agentId: true
          }
        }
      }
    });
    
    console.log(`Found ${recordings.length} recordings:\n`);
    
    recordings.forEach((rec, index) => {
      console.log(`\n📞 Recording ${index + 1}:`);
      console.log(`   ID: ${rec.id}`);
      console.log(`   Call: ${rec.callRecord?.phoneNumber || 'Unknown'}`);
      console.log(`   Date: ${rec.createdAt}`);
      console.log(`   File Name: ${rec.fileName}`);
      console.log(`   File Path: ${rec.filePath}`);
      console.log(`   File Size: ${rec.fileSize || 'Unknown'}`);
      console.log(`   Duration: ${rec.duration || 'Unknown'}s`);
      console.log(`   Storage Type: ${rec.storageType}`);
      console.log(`   Upload Status: ${rec.uploadStatus}`);
      
      // Analyze the file path
      if (!rec.filePath) {
        console.log(`   ⚠️  WARNING: No file path stored!`);
      } else if (rec.filePath.includes('api.twilio.com')) {
        console.log(`   ✅ Twilio URL detected`);
      } else if (/^RE[a-zA-Z0-9]{32}$/.test(rec.filePath)) {
        console.log(`   ✅ Twilio Recording SID detected`);
      } else if (rec.filePath.startsWith('/') || rec.filePath.startsWith('./')) {
        console.log(`   📁 Local file path detected`);
      } else {
        console.log(`   ❓ Unknown path format`);
      }
    });
    
    // Summary
    console.log('\n\n📊 SUMMARY:');
    const twilioUrls = recordings.filter(r => r.filePath?.includes('api.twilio.com')).length;
    const twilioSids = recordings.filter(r => r.filePath && /^RE[a-zA-Z0-9]{32}$/.test(r.filePath)).length;
    const localFiles = recordings.filter(r => r.filePath?.startsWith('/')).length;
    const noPath = recordings.filter(r => !r.filePath).length;
    
    console.log(`   Twilio URLs: ${twilioUrls}`);
    console.log(`   Twilio SIDs: ${twilioSids}`);
    console.log(`   Local Files: ${localFiles}`);
    console.log(`   No Path: ${noPath}`);
    
    if (noPath > 0) {
      console.log('\n   ⚠️  Some recordings have no file path - these cannot be downloaded!');
    }
    
    if (twilioUrls > 0 || twilioSids > 0) {
      console.log('\n   ℹ️  Twilio recordings require valid Twilio credentials to download');
      console.log('      Check: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecordingPaths();
