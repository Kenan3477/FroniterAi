// Vercel Authentication Fix
// This script will help identify the authentication issue between localhost and Vercel

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './backend/.env' });

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function diagnoseAuthIssue() {
  try {
    console.log('🔍 VERCEL AUTHENTICATION DIAGNOSIS');
    console.log('=====================================\n');

    // Check all users in database
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        username: true, 
        email: true, 
        firstName: true, 
        lastName: true, 
        name: true, 
        role: true,
        isActive: true
      }
    });

    console.log('📋 Available Users in Railway Database:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id} | Username: ${user.username} | Email: ${user.email}`);
      console.log(`    Name: ${user.firstName} ${user.lastName} | Role: ${user.role} | Active: ${user.isActive}`);
      console.log('');
    });

    // Check environment variables that would be used for passwords
    console.log('🔐 Environment Variables Status:');
    console.log(`  - ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? 'SET' : 'NOT_SET'}`);
    console.log(`  - AGENT_PASSWORD: ${process.env.AGENT_PASSWORD ? 'SET' : 'NOT_SET'}`);
    console.log(`  - DEMO_PASSWORD: ${process.env.DEMO_PASSWORD ? 'SET' : 'NOT_SET'}`);
    console.log('');

    // Test Railway backend API accessibility
    console.log('🌐 Testing Railway Backend Access:');
    try {
      const response = await fetch('https://froniterai-production.up.railway.app/api/health');
      console.log(`  - Railway Health Check: ${response.ok ? '✅ OK' : '❌ Failed'}`);
    } catch (error) {
      console.log(`  - Railway Health Check: ❌ Error - ${error.message}`);
    }

    // Look for any user that might be "Kenan" 
    const kenanUser = users.find(user => 
      user.firstName?.toLowerCase().includes('kenan') || 
      user.lastName?.toLowerCase().includes('kenan') ||
      user.username?.toLowerCase().includes('kenan') ||
      user.email?.toLowerCase().includes('kenan')
    );

    if (kenanUser) {
      console.log('👤 Found Kenan User:');
      console.log(`  - ${JSON.stringify(kenanUser, null, 2)}`);
    } else {
      console.log('❌ No "Kenan" user found in database');
      console.log('   This explains why localhost works but Vercel doesn\'t');
      console.log('   Localhost might be using cached auth or different backend');
    }

    console.log('\n🔧 SOLUTION:');
    console.log('To fix Vercel authentication, users need to:');
    console.log('1. Visit https://omnivox.vercel.app/login');
    console.log('2. Login with one of these accounts:');
    users.forEach(user => {
      console.log(`   - ${user.email} (Role: ${user.role})`);
    });
    console.log('3. Use the password from environment variables');
    console.log('');
    console.log('💡 Most likely credentials:');
    console.log(`   - Admin: admin@omnivox-ai.com / ${process.env.ADMIN_PASSWORD || '[SET_IN_ENV]'}`);
    if (process.env.DEMO_PASSWORD) {
      console.log(`   - Agent: agent@omnivox-ai.com / ${process.env.DEMO_PASSWORD}`);
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseAuthIssue();