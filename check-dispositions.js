#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDispositions() {
  console.log('📋 Checking dispositions in database...\n');

  try {
    const dispositions = await prisma.disposition.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    if (dispositions.length === 0) {
      console.log('⚠️ No dispositions found. Creating default dispositions...');
      
      const defaultDispositions = [
        { name: 'Connected', description: 'Customer answered and conversation completed', category: 'success' },
        { name: 'Not Interested', description: 'Customer expressed no interest', category: 'rejection' },
        { name: 'Callback Requested', description: 'Customer requested to be called back later', category: 'follow_up' },
        { name: 'No Answer', description: 'Phone rang but no answer', category: 'no_contact' },
        { name: 'Voicemail', description: 'Call went to voicemail', category: 'no_contact' },
        { name: 'Wrong Number', description: 'Incorrect phone number', category: 'invalid' },
        { name: 'Completed Sale', description: 'Sale successfully completed', category: 'success' },
        { name: 'Do Not Call', description: 'Customer requested to not be called again', category: 'dnc' }
      ];

      for (const disposition of defaultDispositions) {
        await prisma.disposition.create({
          data: disposition
        });
      }

      console.log(`✅ Created ${defaultDispositions.length} default dispositions`);
    } else {
      console.log(`✅ Found ${dispositions.length} existing dispositions:`);
    }

    // List all dispositions
    const allDispositions = await prisma.disposition.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    allDispositions.forEach((disposition, index) => {
      console.log(`${index + 1}. ${disposition.name} (${disposition.category || 'general'})`);
    });

    console.log('\n✅ Disposition system ready for call recording tests!');
    
  } catch (error) {
    console.error('❌ Error checking dispositions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDispositions().catch(console.error);