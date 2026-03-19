const jwt = require('jsonwebtoken');

// Generate a valid JWT token for user 509 for testing
const jwtSecret = process.env.JWT_SECRET || 'your-default-secret-key';

console.log('=== GENERATING TEST JWT FOR USER 509 ===\n');

const testTokenPayload = {
  userId: 509,
  username: 'ken',
  email: 'ken@simpleemails.co.uk', 
  role: 'ADMIN',
  organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
  agentId: 'user-509',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
};

const testToken = jwt.sign(testTokenPayload, jwtSecret);

console.log('Token payload:', testTokenPayload);
console.log('\nGenerated JWT token for user 509:');
console.log(testToken);

console.log('\n🧪 Test this token by:');
console.log('1. Replace the current JWT in browser localStorage');
console.log('2. Or use this in API testing');
console.log('3. Should resolve 403 errors if migration completed');