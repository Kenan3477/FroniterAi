#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3004';

async function testAdminNavigation() {
  console.log('🔍 Testing Admin Navigation Issue');
  console.log('=================================\n');

  try {
    // Test 1: Login as ADMIN user
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@omnivox-ai.com',
      password: 'OmnivoxAdmin2025!'
    });

    if (adminLoginResponse.data.success) {
      console.log('✅ ADMIN user logged in successfully');
      console.log(`   User: ${adminLoginResponse.data.data.user.email}`);
      console.log(`   Role: ${adminLoginResponse.data.data.user.role}`);
      
      const adminToken = adminLoginResponse.data.data.token;

      // Test 2: Check admin profile endpoint
      console.log('\n2️⃣ Testing profile endpoint...');
      const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          Cookie: `token=${adminToken}`
        }
      });
      
      if (profileResponse.data.success) {
        console.log('✅ Profile endpoint working');
        console.log(`   Profile role: ${profileResponse.data.data.user.role}`);
      } else {
        console.log('❌ Profile endpoint failed:', profileResponse.data);
      }

      // Test 3: Check if admin endpoints are accessible
      console.log('\n3️⃣ Testing admin endpoint access...');
      try {
        const adminUsersResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Admin users endpoint accessible');
      } catch (error) {
        console.log('❌ Admin users endpoint failed:', error.response?.status);
      }

      // Test 4: Check reports endpoints
      console.log('\n4️⃣ Testing reports endpoint access...');
      try {
        const reportsResponse = await axios.get(`${BASE_URL}/api/reports/users`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Reports endpoint accessible');
      } catch (error) {
        console.log('❌ Reports endpoint failed:', error.response?.status);
      }

    } else {
      console.log('❌ ADMIN user login failed:', adminLoginResponse.data);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testAdminNavigation();