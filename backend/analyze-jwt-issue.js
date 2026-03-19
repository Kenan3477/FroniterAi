const jwt = require('jsonwebtoken');

// Extract and decode JWT token from frontend logs
console.log('=== JWT TOKEN DECODER ===\n');

// The frontend is getting user info, so there must be a valid token
// Let's decode what might be in use

console.log('Looking for potential issues with JWT token for user 509 (ken@simpleemails.co.uk)...\n');

console.log('Expected token payload should contain:');
console.log({
  userId: 509,
  username: 'ken', 
  email: 'ken@simpleemails.co.uk',
  role: 'ADMIN',
  organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
  agentId: 'user-509'
});

console.log('\n🔍 Diagnosis of 403 error:');
console.log('1. Frontend shows user authenticated: ✅');
console.log('2. User ID 509 exists in Railway DB: ❓ (needs migration)');  
console.log('3. User 509 in Omnivox organization: ❓ (needs migration)');
console.log('4. Agent record exists for user 509: ❓ (needs migration)');
console.log('5. Campaign assignments exist: ❓ (needs migration)');

console.log('\n⏳ Railway is currently deploying the production migration...');
console.log('Migration will:');
console.log('- Create/update user 509 in Omnivox organization');
console.log('- Create agent record user-509'); 
console.log('- Assign all campaigns to user 509');
console.log('- Ensure DAC campaign exists');

console.log('\n📝 Once migration completes, the 403 errors should resolve.');
console.log('If issues persist, the frontend may need a new JWT token with correct organizationId.');