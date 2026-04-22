/**
 * Quick Setup Script for Inbound Number Audio Configuration
 * 
 * This script configures your inbound number with audio file URLs
 * and business hours settings.
 * 
 * Usage:
 *   node setup-inbound-audio.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupInboundAudio() {
  console.log('🔧 Starting inbound audio configuration...');
  
  const phoneNumber = '+442046343130';
  
  // TODO: Replace these URLs with your actual audio file URLs
  const audioConfig = {
    greetingAudioUrl: 'https://YOUR-STORAGE-URL/greeting.mp3',
    outOfHoursAudioUrl: 'https://YOUR-STORAGE-URL/out-of-hours.mp3',
    voicemailAudioUrl: 'https://YOUR-STORAGE-URL/voicemail-prompt.mp3',
    queueAudioUrl: 'https://YOUR-STORAGE-URL/queue-message.mp3'
  };
  
  const businessHoursConfig = {
    businessHours: JSON.stringify({
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    }),
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    timezone: 'Europe/London',
    outOfHoursAction: 'hangup', // or 'voicemail'
    recordCalls: true,
    isActive: true
  };
  
  console.log('\n📋 Configuration to apply:');
  console.log('Phone Number:', phoneNumber);
  console.log('Audio URLs:', audioConfig);
  console.log('Business Hours:', businessHoursConfig);
  
  // Check if inbound number exists
  const existing = await prisma.inboundNumber.findUnique({
    where: { phoneNumber }
  });
  
  if (!existing) {
    console.error(`❌ Inbound number ${phoneNumber} not found in database!`);
    console.log('Available numbers:');
    const allNumbers = await prisma.inboundNumber.findMany({
      select: { phoneNumber: true, displayName: true }
    });
    console.table(allNumbers);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  console.log('\n✅ Found existing inbound number:', existing.displayName);
  console.log('Current configuration:');
  console.log('  Greeting Audio:', existing.greetingAudioUrl || 'NOT SET');
  console.log('  Out-of-Hours Audio:', existing.outOfHoursAudioUrl || 'NOT SET');
  console.log('  Voicemail Audio:', existing.voicemailAudioUrl || 'NOT SET');
  console.log('  Queue Audio:', existing.queueAudioUrl || 'NOT SET');
  
  // Validate audio URLs
  const urlsToValidate = Object.entries(audioConfig).filter(([key, url]) => url && !url.includes('YOUR-STORAGE-URL'));
  
  if (urlsToValidate.length === 0) {
    console.warn('\n⚠️  WARNING: You have not configured real audio URLs yet!');
    console.warn('   Please edit this script and replace YOUR-STORAGE-URL with your actual storage.');
    console.warn('   Upload audio files to:');
    console.warn('     - AWS S3');
    console.warn('     - Twilio Assets');
    console.warn('     - Your own CDN/server');
    console.warn('\n   Skipping update to prevent overwriting with invalid URLs.');
    await prisma.$disconnect();
    process.exit(0);
  }
  
  // Update the inbound number
  console.log('\n🔄 Updating inbound number configuration...');
  
  const result = await prisma.inboundNumber.update({
    where: { phoneNumber },
    data: {
      ...audioConfig,
      ...businessHoursConfig
    }
  });
  
  console.log('\n✅ Inbound number configured successfully!');
  console.log('\n📋 Updated configuration:');
  console.log('Phone Number:', result.phoneNumber);
  console.log('Display Name:', result.displayName);
  console.log('\nAudio URLs:');
  console.log('  ✅ Greeting:', result.greetingAudioUrl || '❌ NOT SET');
  console.log('  ✅ Out-of-Hours:', result.outOfHoursAudioUrl || '❌ NOT SET');
  console.log('  ✅ Voicemail:', result.voicemailAudioUrl || '❌ NOT SET');
  console.log('  ✅ Queue:', result.queueAudioUrl || '⚠️  NOT SET (optional)');
  console.log('\nBusiness Hours:');
  console.log('  Days:', result.businessHours);
  console.log('  Start:', result.businessHoursStart);
  console.log('  End:', result.businessHoursEnd);
  console.log('  Timezone:', result.timezone);
  console.log('  Out-of-Hours Action:', result.outOfHoursAction);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Test calling during business hours: Should hear greeting audio');
  console.log('2. Test calling outside business hours: Should hear out-of-hours audio');
  console.log('3. Check Railway logs for any errors');
  console.log('4. Verify agent notifications appear in Omnivox UI');
  
  await prisma.$disconnect();
}

setupInboundAudio().catch(async (error) => {
  console.error('❌ Error configuring inbound audio:', error);
  await prisma.$disconnect();
  process.exit(1);
});
