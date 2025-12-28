#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3004';

async function testRoleBasedAccess() {
  console.log('🔐 Testing Role-Based Access Control');
  console.log('=====================================\n');

  try {
    // Test 1: Login as AGENT user (albert)
    console.log('1️⃣ Testing AGENT user access...');
    const agentLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'albert@test.co.uk',
      password: '3477'
    });

    if (agentLoginResponse.data.success) {
      console.log('✅ AGENT user logged in successfully');
      console.log(`   User: ${agentLoginResponse.data.user.email}`);
      console.log(`   Role: ${agentLoginResponse.data.user.role}`);
      
      const agentToken = agentLoginResponse.data.token;

      // Test AGENT access to admin endpoints
      try {
        const adminAccessResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${agentToken}` }
        });
        console.log('❌ SECURITY ISSUE: AGENT user can access admin endpoints');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ AGENT user correctly blocked from admin endpoints');
        } else {
          console.log('⚠️ Unexpected error testing admin access:', error.response?.status);
        }
      }

      // Test AGENT access to reports endpoints
      try {
        const reportsAccessResponse = await axios.get(`${BASE_URL}/api/reports/campaigns`, {
          headers: { Authorization: `Bearer ${agentToken}` }
        });
        console.log('❌ SECURITY ISSUE: AGENT user can access reports endpoints');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ AGENT user correctly blocked from reports endpoints');
        } else {
          console.log('⚠️ Unexpected error testing reports access:', error.response?.status);
        }
      }
    } else {
      console.log('❌ AGENT user login failed:', agentLoginResponse.data);
    }

    console.log('\n2️⃣ Testing ADMIN user access...');
    
    // Test 2: Login as ADMIN user
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@omnivox.ai',
      password: 'admin123!'
    });

    if (adminLoginResponse.data.success) {
      console.log('✅ ADMIN user logged in successfully');
      console.log(`   User: ${adminLoginResponse.data.user.email}`);
      console.log(`   Role: ${adminLoginResponse.data.user.role}`);
      
      const adminToken = adminLoginResponse.data.token;

      // Test ADMIN access to admin endpoints
      try {
        const adminAccessResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ ADMIN user can access admin endpoints');
      } catch (error) {
        console.log('❌ ADMIN user blocked from admin endpoints:', error.response?.status);
      }

      // Test ADMIN access to reports endpoints
      try {
        const reportsAccessResponse = await axios.get(`${BASE_URL}/api/reports/campaigns`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ ADMIN user can access reports endpoints');
      } catch (error) {
        console.log('❌ ADMIN user blocked from reports endpoints:', error.response?.status);
      }
    } else {
      console.log('❌ ADMIN user login failed:', adminLoginResponse.data);
    }

    console.log('\n🔐 Role-Based Access Control Test Complete');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testRoleBasedAccess();