#!/usr/bin/env node

/**
 * Test phone number matching logic
 * Tests the scenario: Kenan Davies has "7487723751" but user dials "07487723751"
 */

console.log('🧪 Testing phone number matching logic\n');

function normalizePhoneNumber(phone) {
  if (!phone || phone === 'Unknown') return [];
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Generate different variants
  const variants = new Set();
  
  // Original number (cleaned)
  variants.add(digitsOnly);
  
  // UK format handling - if starts with 44, also try with 0 prefix
  if (digitsOnly.startsWith('44')) {
    const withoutCountryCode = digitsOnly.substring(2);
    variants.add('0' + withoutCountryCode);
    variants.add(withoutCountryCode);
  }
  
  // If starts with 0, also try without 0
  if (digitsOnly.startsWith('0')) {
    variants.add(digitsOnly.substring(1));
    // Also try with +44
    variants.add('44' + digitsOnly.substring(1));
  }
  
  // If doesn't start with 0 or 44, try with 0 prefix
  if (!digitsOnly.startsWith('0') && !digitsOnly.startsWith('44')) {
    variants.add('0' + digitsOnly);
    variants.add('44' + digitsOnly);
  }
  
  // Convert back to array
  return Array.from(variants).filter(v => v.length > 0);
}

// Test cases
const testCases = [
  {
    dialed: '07487723751',
    stored: '7487723751',
    description: 'Kenan Davies scenario'
  },
  {
    dialed: '07487723751',
    stored: '07487723751', 
    description: 'Exact match'
  },
  {
    dialed: '+447487723751',
    stored: '7487723751',
    description: 'International format to local'
  },
  {
    dialed: '7487723751',
    stored: '07487723751',
    description: 'Local to national format'
  }
];

for (const testCase of testCases) {
  console.log(`📞 Test: ${testCase.description}`);
  console.log(`   Dialed: ${testCase.dialed}`);
  console.log(`   Stored: ${testCase.stored}`);
  
  const dialedVariants = normalizePhoneNumber(testCase.dialed);
  const storedVariants = normalizePhoneNumber(testCase.stored);
  
  console.log(`   Dialed variants: [${dialedVariants.join(', ')}]`);
  console.log(`   Stored variants: [${storedVariants.join(', ')}]`);
  
  // Check if any variants match
  const hasMatch = dialedVariants.some(dv => storedVariants.includes(dv));
  
  console.log(`   ✅ MATCH: ${hasMatch ? 'YES' : 'NO'}\n`);
}

console.log('🎯 Test Summary:');
console.log('- All test cases should show "MATCH: YES"');
console.log('- This verifies that different phone number formats will be properly matched');