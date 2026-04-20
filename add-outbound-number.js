/**
 * Adds +44 1642 053664 (Teesside/Middlesbrough local number) as an
 * available outbound CLI number in the InboundNumber table.
 *
 * Run: node add-outbound-number.js
 *
 * IMPORTANT: Ensure this number is purchased/verified on the Twilio account
 * before using it as a caller ID.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addOutboundNumber() {
  try {
    const E164 = '+441642053664';
    const displayName = 'UK Local - Teesside';

    // Check if it already exists
    const existing = await prisma.inboundNumber.findFirst({
      where: { phoneNumber: E164 }
    });

    if (existing) {
      console.log(`⚠️  Number ${E164} already exists (id: ${existing.id}). Updating to isActive=true.`);
      await prisma.inboundNumber.update({
        where: { id: existing.id },
        data: { isActive: true }
      });
      console.log('✅ Updated to active.');
      return;
    }

    const record = await prisma.inboundNumber.create({
      data: {
        phoneNumber: E164,
        displayName,
        description: 'Teesside / Middlesbrough outbound CLI',
        country: 'GB',
        region: 'Teesside',
        numberType: 'LOCAL',
        provider: 'TWILIO',
        capabilities: JSON.stringify(['VOICE']),
        isActive: true
      }
    });

    console.log(`✅ Added outbound number: ${record.phoneNumber} (${record.displayName}) — id: ${record.id}`);
  } catch (err) {
    console.error('❌ Failed to add number:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

addOutboundNumber();
