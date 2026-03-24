#!/usr/bin/env node
/**
 * Generate System JWT Token for Frontend-Backend Communication
 */

const jwt = require('jsonwebtoken');

// Get JWT secret from environment - use Railway production secret
const JWT_SECRET = process.env.JWT_SECRET || 'kennex-super-secret-jwt-key-for-production-2025';

// Create a system user payload
const systemUserPayload = {
  userId: 509,  // Ken Admin user ID
  username: 'system-frontend',
  role: 'ADMIN',
  email: 'system@omnivox.ai'
};

// Generate long-lived token for frontend-backend communication
const systemToken = jwt.sign(systemUserPayload, JWT_SECRET, { 
  expiresIn: '365d'  // 1 year token for system communication
});

console.log('🔐 Generated System JWT Token:');
console.log(systemToken);
console.log('\n📝 Add this to your frontend environment variables:');
console.log(`BACKEND_API_KEY="${systemToken}"`);
console.log('\n✅ This token allows the frontend to authenticate with the backend for system operations.');
console.log(`\n🔑 Using JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);