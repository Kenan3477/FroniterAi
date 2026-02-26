#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCallIdConflicts() {
  console.log('🔍 Checking for callId conflicts in database...\n');

  try {
    // Check all existing callIds
    const callRecords = await prisma.callRecord.findMany({
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${callRecords.length} existing call records:`);
    callRecords.forEach((record, index) => {
      console.log(`${index + 1}. callId: ${record.callId} | phone: ${record.phoneNumber} | created: ${record.createdAt}`);
    });

    // Check for specific callIds that might conflict
    const testCallIds = [
      'CA1234567890abcdef1234567890abcdef',
      'conf-1772107318199-yv6wdk2x8'
    ];

    console.log('\n🔍 Checking for potential conflicts:');
    for (const callId of testCallIds) {
      const existing = await prisma.callRecord.findUnique({
        where: { callId: callId }
      });
      
      if (existing) {
        console.log(`❌ CONFLICT: CallId "${callId}" already exists (ID: ${existing.id})`);
      } else {
        console.log(`✅ Available: CallId "${callId}" is free`);
      }
    }

    // Check for duplicate callIds
    const duplicateCheck = await prisma.callRecord.groupBy({
      by: ['callId'],
      _count: {
        callId: true
      },
      having: {
        callId: {
          _count: {
            gt: 1
          }
        }
      }
    });

    if (duplicateCheck.length > 0) {
      console.log('\n🚨 Found duplicate callIds:');
      duplicateCheck.forEach(dup => {
        console.log(`   - "${dup.callId}" appears ${dup._count.callId} times`);
      });
    } else {
      console.log('\n✅ No duplicate callIds found');
    }

  } catch (error) {
    console.error('❌ Error checking callId conflicts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallIdConflicts().catch(console.error);