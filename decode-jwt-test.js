#!/usr/bin/env node

// Test JWT token decoding
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwOSwiZW1haWwiOiJrZW5Ac2ltcGxlZW1haWxzLmNvLnVrIiwicm9sZSI6IkFETUlOIiwibmFtZSI6IktlbmFuIEJhaGFyaSIsImlhdCI6MTczNDU2NDUwNywiZXhwIjoxNzM0NjUwOTA3fQ.lKe4Jg_wMgtUlCmJeXPGTpnfGn0AQf37nOLqvh0fEUY';

console.log('🔍 JWT Token Analysis:');
console.log('Token starts with eyJ:', jwt.includes('eyJ'));
console.log('Token length:', jwt.length);
console.log('Token length > 100:', jwt.length > 100);

// Decode the JWT
try {
  const parts = jwt.split('.');
  console.log('JWT parts:', parts.length);
  
  if (parts.length === 3) {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('Header:', header);
    console.log('Payload:', payload);
    
    console.log('User ID:', payload.userId);
    console.log('Email:', payload.email);
    console.log('Role:', payload.role);
    console.log('Issued at:', new Date(payload.iat * 1000));
    console.log('Expires at:', new Date(payload.exp * 1000));
    console.log('Current time:', new Date());
    console.log('Is expired:', new Date(payload.exp * 1000) < new Date());
  }
} catch (error) {
  console.error('❌ JWT decode error:', error);
}