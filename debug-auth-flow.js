#!/usr/bin/env node

// Frontend debug helper to check the authentication flow
const fs = require('fs');
const path = require('path');

console.log('🔍 Frontend Authentication Flow Debug\n');

console.log('Based on the code analysis:\n');

console.log('1. Authentication Flow:');
console.log('   ✅ Frontend route checks for auth-token cookie');
console.log('   ✅ Backend API requires Authorization header with Bearer token');
console.log('   ✅ Frontend route forwards token as Bearer header');
console.log('   ❓ Need to check if the auth-token cookie is actually valid\n');

console.log('2. Possible Issues:');
console.log('   🔍 Auth token cookie might be expired');
console.log('   🔍 Auth token format might be incorrect');
console.log('   🔍 Cookie domain/path might not match');
console.log('   🔍 Backend token validation might be failing\n');

console.log('3. Debugging Steps:');
console.log('   1. Open browser console on the admin page');
console.log('   2. Check Application tab -> Cookies for auth-token');
console.log('   3. Check Network tab when loading Voice Channels');
console.log('   4. Look for any 401 errors or API failures\n');

console.log('4. Quick Test Command (run in browser console):');
console.log('   ```javascript');
console.log('   fetch("/api/voice/inbound-numbers")');
console.log('     .then(res => res.json())');
console.log('     .then(data => console.log("API Response:", data))');
console.log('     .catch(err => console.error("API Error:", err))');
console.log('   ```\n');

console.log('5. Alternative Test - Check Auth Token:');
console.log('   ```javascript');
console.log('   console.log("Auth token:", document.cookie');
console.log('     .split("; ")');
console.log('     .find(row => row.startsWith("auth-token="))');
console.log('     ?.split("=")[1]);');
console.log('   ```\n');

console.log('💡 Most likely issue: Authentication token expired or invalid');
console.log('💡 Quick fix: Try logging out and logging back in');

async function checkBackendLogs() {
  console.log('\n📋 Checking if there are any recent backend logs...');
  
  try {
    const backendLogPath = '/Users/zenan/kennex/backend/backend.log';
    if (fs.existsSync(backendLogPath)) {
      const stats = fs.statSync(backendLogPath);
      const now = new Date();
      const ageMinutes = (now - stats.mtime) / (1000 * 60);
      
      if (ageMinutes < 60) {
        console.log(`📄 Backend log exists (last modified ${Math.round(ageMinutes)} minutes ago)`);
        console.log('   You can check it with: tail -20 backend/backend.log');
      } else {
        console.log('📄 Backend log exists but is older than 1 hour');
      }
    } else {
      console.log('📄 No local backend log found (backend runs on Railway)');
    }
    
    // Check for frontend .next logs
    const frontendBuildDir = '/Users/zenan/kennex/frontend/.next';
    if (fs.existsSync(frontendBuildDir)) {
      console.log('🏗️  Frontend build directory exists');
      console.log('   Frontend API routes are running locally');
    } else {
      console.log('🏗️  No frontend build directory (may need to run: npm run build)');
    }
    
  } catch (error) {
    console.log('❌ Error checking logs:', error.message);
  }
}

checkBackendLogs();