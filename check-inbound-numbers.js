#!/usr/bin/env node

// Quick script to check what inbound numbers exist in the database
const { PrismaClient } = require('@prisma/client');

async function checkInboundNumbers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database for inbound numbers...');
    
    // Get all inbound numbers
    const allNumbers = await prisma.inboundNumber.findMany();
    console.log(`\n📊 Total inbound numbers in database: ${allNumbers.length}`);
    
    allNumbers.forEach((num, index) => {
      console.log(`\n${index + 1}. ${num.phoneNumber}`);
      console.log(`   Display Name: ${num.displayName}`);
      console.log(`   Is Active: ${num.isActive}`);
      console.log(`   ID: ${num.id}`);
      console.log(`   Provider: ${num.provider}`);
      console.log(`   Country: ${num.country}`);
      console.log(`   Created: ${num.createdAt}`);
    });
    
    // Specifically check for the 130 number
    console.log('\n🎯 Checking for the 130 number specifically...');
    const specificNumber = await prisma.inboundNumber.findFirst({
      where: {
        phoneNumber: { contains: '130' }
      }
    });
    
    if (specificNumber) {
      console.log('✅ Found the 130 number:');
      console.log('   Phone:', specificNumber.phoneNumber);
      console.log('   Active:', specificNumber.isActive);
      console.log('   Display:', specificNumber.displayName);
    } else {
      console.log('❌ The 130 number was not found in the database');
    }
    
    // Check active numbers specifically
    console.log('\n🔍 Checking active numbers only...');
    const activeNumbers = await prisma.inboundNumber.findMany({
      where: { isActive: true }
    });
    
    console.log(`📊 Active inbound numbers: ${activeNumbers.length}`);
    activeNumbers.forEach((num) => {
      console.log(`   ✅ ${num.phoneNumber} - ${num.displayName}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInboundNumbers();