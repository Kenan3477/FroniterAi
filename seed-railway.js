#!/usr/bin/env node

// Seed inbound number directly to Railway backend via API
const fetch = require('node-fetch');

async function seedToRailway() {
  console.log('🚂 Seeding inbound number to Railway backend...\n');

  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Test if backend is accessible
    console.log('1. Testing Railway backend accessibility...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.text();
      console.log('✅ Railway backend is accessible:', health);
    } else {
      console.log('❌ Railway backend health check failed:', healthResponse.status);
    }

    // We need to seed via a different approach since we don't have direct database access
    // Let's check if there's a seeding endpoint on the backend
    console.log('\n2. Checking backend endpoints...');
    
    // Since we can't directly access Railway's database, let's create the number via a POST request
    // First, let's see if there's a way to create inbound numbers via API
    
    console.log('\n🔧 Problem Identified:');
    console.log('- Frontend connects to Railway backend (Production)');
    console.log('- Railway backend has its own PostgreSQL database');
    console.log('- Our local seeding only affected local PostgreSQL');
    console.log('- Railway database is empty of inbound numbers');
    
    console.log('\n💡 Solutions:');
    console.log('1. Add the inbound number via Railway backend admin panel');
    console.log('2. Create a seeding endpoint in the backend');
    console.log('3. Manually add via backend API (if endpoint exists)');
    console.log('4. Use Railway CLI to access the database directly');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Check if backend has a POST endpoint to create inbound numbers');
    console.log('2. If not, we need to add the seeding logic to the backend');
    console.log('3. Or use the frontend admin interface to create the number');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

seedToRailway();