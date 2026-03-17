#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDispositionConstraint() {
  console.log('🔍 Debugging disposition foreign key constraint...\n');

  try {
    const targetDispositionId = 'cmm3dgmwb0000bk8b9ipcm8iv';

    // 1. Check if the specific disposition exists
    console.log('1. Checking if target disposition exists...');
    const disposition = await prisma.disposition.findUnique({
      where: { id: targetDispositionId }
    });

    if (disposition) {
      console.log('✅ Disposition found:', JSON.stringify(disposition, null, 2));
    } else {
      console.log('❌ Disposition NOT found with ID:', targetDispositionId);
    }

    // 2. Check any existing call records with dispositions
    console.log('\n2. Checking existing call records with dispositions...');
    const callsWithDispositions = await prisma.callRecord.findMany({
      where: {
        dispositionId: { not: null }
      },
      select: {
        id: true,
        callId: true,
        dispositionId: true,
        disposition: true
      },
      take: 5
    });

    if (callsWithDispositions.length > 0) {
      console.log(`✅ Found ${callsWithDispositions.length} calls with dispositions:`);
      callsWithDispositions.forEach((call, index) => {
        console.log(`   ${index + 1}. CallId: ${call.callId}, DispositionId: ${call.dispositionId}`);
        console.log(`      Disposition: ${call.disposition?.name || 'NULL'}`);
      });
    } else {
      console.log('⚠️ No existing call records have dispositions set');
    }

    // 3. Try a simple test insert 
    console.log('\n3. Testing simple call record creation with disposition...');
    
    // First create a test contact
    const testContact = await prisma.contact.create({
      data: {
        contactId: `test-contact-${Date.now()}`,
        listId: 'manual-contacts',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        status: 'contacted'
      }
    });

    // Try to create a call record with the disposition
    try {
      const testCall = await prisma.callRecord.create({
        data: {
          callId: `test-call-${Date.now()}`,
          campaignId: '1',
          contactId: testContact.contactId,
          agentId: '509',
          phoneNumber: '+1234567890',
          callType: 'outbound',
          startTime: new Date(),
          dispositionId: targetDispositionId
        }
      });
      
      console.log('✅ Test call record created successfully with disposition!');
      console.log(`   CallId: ${testCall.callId}, DispositionId: ${testCall.dispositionId}`);
      
      // Clean up test data
      await prisma.callRecord.delete({ where: { id: testCall.id } });
      await prisma.contact.delete({ where: { id: testContact.id } });
      
    } catch (callError) {
      console.log('❌ Test call record creation failed:', callError.message);
      
      // Clean up test contact
      await prisma.contact.delete({ where: { id: testContact.id } });
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDispositionConstraint().catch(console.error);