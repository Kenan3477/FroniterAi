#!/usr/bin/env node

/**
 * Railway Backend Diagnostic Tool
 * Tests Railway backend connectivity and routing
 */

const RAILWAY_URL = 'https://omnivox-backend-production.up.railway.app';

async function diagnoseRailwayBackend() {
  console.log('🔍 Railway Backend Diagnostic Tool');
  console.log('=' .repeat(50));
  console.log(`Testing: ${RAILWAY_URL}`);

  const endpoints = [
    '/health',
    '/api',
    '/api/health', 
    '/api/auth',
    '/api/admin',
    '/api/admin/user-sessions',
    '/'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing: ${endpoint}`);
      
      const response = await fetch(`${RAILWAY_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Railway-Diagnostic-Tool'
        }
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = await response.json();
          console.log(`  JSON Response: ${JSON.stringify(data, null, 2)}`);
        } catch (e) {
          console.log(`  Failed to parse JSON response`);
        }
      } else {
        const text = await response.text();
        console.log(`  Text Response (first 200 chars): ${text.substring(0, 200)}`);
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Test if it's a Railway routing issue vs backend issue
  console.log('\n🔍 Railway Service Analysis:');
  
  // Test with different methods
  try {
    const postResponse = await fetch(`${RAILWAY_URL}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log(`POST /health: ${postResponse.status}`);
  } catch (e) {
    console.log(`POST /health: Error - ${e.message}`);
  }

  // Test with different user agents
  try {
    const browserResponse = await fetch(`${RAILWAY_URL}/health`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }
    });
    console.log(`Browser UA /health: ${browserResponse.status}`);
  } catch (e) {
    console.log(`Browser UA /health: Error - ${e.message}`);
  }

  console.log('\n📋 Diagnosis Summary:');
  console.log('- If all endpoints return 404 "Application not found": Railway routing issue');
  console.log('- If some endpoints work: Backend configuration issue');  
  console.log('- If different methods work: HTTP method routing issue');
  console.log('- Check Railway dashboard for service status and logs');
}

// Run the diagnostic
diagnoseRailwayBackend().catch(console.error);