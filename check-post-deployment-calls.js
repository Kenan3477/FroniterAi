const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPostDeploymentCalls() {
  // Recording fix deployed at 17:31 on April 22, 2026
  const deploymentTime = new Date('2026-04-22T17:31:00+01:00');
  
  console.log(`\n🚀 DEPLOYMENT TIME: ${deploymentTime.toLocaleString()}\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get ALL calls after deployment (not just without recordings)
  const postDeploymentCalls = await prisma.callRecord.findMany({
    where: {
      startTime: { gte: deploymentTime },
      phoneNumber: { not: { startsWith: 'client:' } },
      duration: { gt: 0 }
    },
    orderBy: { startTime: 'desc' }
  });

  console.log(`📊 Total calls AFTER deployment: ${postDeploymentCalls.length}\n`);

  if (postDeploymentCalls.length === 0) {
    console.log('⚠️  NO CALLS MADE AFTER DEPLOYMENT YET!');
    console.log('❗ This means we cannot verify if recording fix is working.\n');
    console.log('✅ Action Required: Make a NEW test call to verify recordings work.\n');
    return;
  }

  const withRecordings = postDeploymentCalls.filter(c => c.recording);
  const withoutRecordings = postDeploymentCalls.filter(c => !c.recording);

  console.log(`✅ Calls WITH recordings: ${withRecordings.length}`);
  console.log(`❌ Calls WITHOUT recordings: ${withoutRecordings.length}\n`);

  if (withoutRecordings.length > 0) {
    console.log('🚨 CRITICAL: CALLS AFTER DEPLOYMENT STILL MISSING RECORDINGS!\n');
    console.log('Recent calls without recordings:\n');
    for (const call of withoutRecordings.slice(0, 5)) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📞 ${call.phoneNumber}`);
      console.log(`🆔 ${call.callId}`);
      console.log(`⏱️  ${call.duration}s`);
      console.log(`📅 ${call.startTime.toLocaleString()}`);
    }
  } else if (withRecordings.length > 0) {
    console.log('✅ SUCCESS! All post-deployment calls have recordings!\n');
    console.log('Sample recorded call:\n');
    const sample = withRecordings[0];
    console.log(`📞 ${sample.phoneNumber}`);
    console.log(`🎙️  Recording: ${sample.recording}`);
    console.log(`⏱️  Duration: ${sample.duration}s`);
    console.log(`📅 ${sample.startTime.toLocaleString()}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

checkPostDeploymentCalls().catch(console.error);
