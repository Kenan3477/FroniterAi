#!/usr/bin/env node

console.log('🔧 Debugging the inbound numbers API response\n');

console.log('Since you are logged into the admin panel, let me help you debug this.');
console.log('Please run these commands in your browser console (F12 → Console tab):\n');

console.log('1. First, check if you have the auth token:');
console.log('   ```javascript');
console.log('   console.log("Auth Cookie:", document.cookie.split("; ").find(row => row.startsWith("auth-token=")));');
console.log('   ```\n');

console.log('2. Then, test the API endpoint:');
console.log('   ```javascript');
console.log('   fetch("/api/voice/inbound-numbers")');
console.log('     .then(res => {');
console.log('       console.log("Status:", res.status);');
console.log('       return res.json();');
console.log('     })');
console.log('     .then(data => console.log("Response:", data))');
console.log('     .catch(err => console.error("Error:", err));');
console.log('   ```\n');

console.log('3. If that works, check the network tab:');
console.log('   - Open Network tab in DevTools');
console.log('   - Navigate to Admin → Voice Channels');
console.log('   - Look for the "inbound-numbers" request');
console.log('   - Check if it returns 200 or an error\n');

console.log('📋 Expected Response Structure:');
console.log('   {');
console.log('     "success": true,');
console.log('     "data": [');
console.log('       {');
console.log('         "id": "uk-local-london",');
console.log('         "number": "+442046343130",');
console.log('         "displayName": "UK Local - London",');
console.log('         "isActive": true');
console.log('       }');
console.log('     ]');
console.log('   }\n');

console.log('🔍 If the API returns empty data: []');
console.log('   That means the backend authentication is working,');
console.log('   but there is a database query issue.\n');

console.log('🔍 If the API returns 401 Unauthorized:');
console.log('   That means the auth token is invalid or expired.');
console.log('   Quick fix: Log out and log back in.\n');

console.log('🔍 If the API returns 500 Server Error:');
console.log('   That means there is a backend server issue.');
console.log('   Check the Railway logs.\n');

console.log('💡 Most likely causes ranked by probability:');
console.log('   1. Auth token expired (login again)');
console.log('   2. Database connection issue on backend');
console.log('   3. Backend code filtering issue');
console.log('   4. Frontend component logic issue\n');

console.log('🎯 Quick Fix:');
console.log('   Try logging out and logging back in first.');
console.log('   If that doesn\'t work, run the browser console test above.');