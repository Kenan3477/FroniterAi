#!/usr/bin/env node

// Final verification script to check database state and confirm the issue
const { PrismaClient } = require('@prisma/client');

async function finalCheck() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 FINAL VERIFICATION: Current system state\n');

    // Check database exactly as backend API does
    console.log('1. Database Query (exact backend logic):');
    const inboundNumbers = await prisma.inboundNumber.findMany({
      where: {
        isActive: true
      },
      include: {
        assignedFlow: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: [
        { country: 'asc' },
        { numberType: 'asc' },
        { phoneNumber: 'asc' }
      ]
    });

    console.log(`   📊 Found ${inboundNumbers.length} active inbound numbers:`);
    
    if (inboundNumbers.length === 0) {
      console.log('   ❌ NO NUMBERS FOUND - This is the problem!');
      console.log('   🔧 The database query returns empty, which means:');
      console.log('      - The number exists but isActive = false, OR');
      console.log('      - The number was deleted, OR');
      console.log('      - Database connection/schema issue');
    } else {
      inboundNumbers.forEach((num, index) => {
        console.log(`   ${index + 1}. ${num.phoneNumber} (${num.displayName})`);
        console.log(`      - ID: ${num.id}`);
        console.log(`      - Active: ${num.isActive}`);
        console.log(`      - Flow: ${num.assignedFlow?.name || 'None'}`);
      });
    }

    // Transform exactly as backend does
    const transformedNumbers = inboundNumbers.map((number) => ({
      id: number.id,
      phoneNumber: number.phoneNumber,
      displayName: number.displayName,
      description: number.description,
      country: number.country,
      region: number.region,
      numberType: number.numberType,
      provider: number.provider,
      capabilities: number.capabilities ? JSON.parse(number.capabilities) : [],
      isActive: number.isActive,
      assignedFlowId: number.assignedFlowId,
      assignedFlow: number.assignedFlow,
      createdAt: number.createdAt,
      updatedAt: number.updatedAt
    }));

    console.log('\n2. Backend API Response (simulated):');
    console.log('   {');
    console.log('     "success": true,');
    console.log(`     "data": ${JSON.stringify(transformedNumbers, null, 6)}`);
    console.log('   }');

    console.log('\n3. Diagnosis:');
    if (transformedNumbers.length === 0) {
      console.log('   🎯 CONFIRMED ISSUE: Database query returns empty');
      console.log('   🔧 Need to check why the seeded number is not active');
      
      // Check if number exists but is inactive
      const allNumbers = await prisma.inboundNumber.findMany({
        where: {
          phoneNumber: '+442046343130'
        }
      });
      
      if (allNumbers.length === 0) {
        console.log('   ❌ Number +442046343130 does NOT exist in database');
        console.log('   💡 Solution: Re-run seed script');
      } else {
        console.log(`   ✅ Number +442046343130 exists but isActive = ${allNumbers[0].isActive}`);
        if (!allNumbers[0].isActive) {
          console.log('   💡 Solution: Update isActive to true');
        }
      }
    } else {
      console.log('   ✅ Database has numbers - issue is in authentication/frontend');
      console.log('   💡 Solution: Check frontend auth token or API call');
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('   💡 Make sure DATABASE_URL is configured correctly');
  } finally {
    await prisma.$disconnect();
  }
}

finalCheck();