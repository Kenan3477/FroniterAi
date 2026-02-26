#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAvailableDispositions() {
  console.log('📋 Checking available dispositions...\n');

  try {
    const dispositions = await prisma.disposition.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        isActive: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    if (dispositions.length === 0) {
      console.log('❌ No dispositions found in database');
    } else {
      console.log(`✅ Found ${dispositions.length} dispositions:`);
      dispositions.forEach((disp, index) => {
        console.log(`${index + 1}. ID: ${disp.id} | Name: "${disp.name}" | Category: ${disp.category || 'none'} | Active: ${disp.isActive}`);
      });

      console.log('\n💡 Use these disposition IDs in your API calls:');
      const activeDispositions = dispositions.filter(d => d.isActive);
      activeDispositions.forEach(disp => {
        console.log(`   - ID "${disp.id}" for "${disp.name}"`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking dispositions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailableDispositions().catch(console.error);