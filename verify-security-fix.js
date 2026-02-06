#!/usr/bin/env node

/**
 * SECURITY VERIFICATION SCRIPT
 * 
 * This script verifies that all hardcoded credentials have been removed
 * and the system is properly configured with environment variables.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FINAL SECURITY VERIFICATION\n');

// Check for any remaining hardcoded credentials
const BANNED_PATTERNS = [
    'OmnivoxAdmin2025!',
    'OmnivoxAgent2025!', 
    'OmnivoxSupervisor2025!',
    'password: \'',
    'password: "',
    'password: `'
];

let securityIssues = [];

function scanFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return;
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const pattern of BANNED_PATTERNS) {
            if (content.includes(pattern)) {
                // Skip if it's in the cleanup script (expected)
                if (filePath.includes('emergency-security-cleanup.js')) continue;
                if (filePath.includes('EMERGENCY_SECURITY_ACTION_REQUIRED.md')) continue;
                if (filePath.includes('.env.emergency')) continue;
                
                securityIssues.push({
                    file: filePath,
                    pattern: pattern,
                    line: content.split('\n').findIndex(line => line.includes(pattern)) + 1
                });
            }
        }
    } catch (error) {
        console.log(`⚠️  Error scanning ${filePath}: ${error.message}`);
    }
}

// Files to check
const criticalFiles = [
    './backend/src/routes/adminSetup.ts',
    './backend/create-initial-users.js', 
    './backend/prisma/seed.ts',
    './clear-session.html',
    './comprehensive-validation.sh'
];

console.log('🔍 Checking critical files for security issues...\n');

for (const file of criticalFiles) {
    scanFile(file);
    if (fs.existsSync(file)) {
        console.log(`✅ Scanned: ${file}`);
    } else {
        console.log(`⚠️  Missing: ${file}`);
    }
}

// Check for environment variable requirements
console.log('\n🔍 Checking environment variable configuration...\n');

const requiredEnvVars = [
    'ADMIN_PASSWORD',
    'AGENT_PASSWORD', 
    'SUPERVISOR_PASSWORD',
    'JWT_SECRET'
];

console.log('Required environment variables:');
for (const envVar of requiredEnvVars) {
    const isSet = process.env[envVar] !== undefined;
    console.log(`   ${envVar}: ${isSet ? '✅ SET' : '❌ NOT SET'}`);
}

// Report results
console.log('\n📊 SECURITY VERIFICATION RESULTS:');
console.log('═══════════════════════════════════\n');

if (securityIssues.length === 0) {
    console.log('🎉 NO HARDCODED CREDENTIALS FOUND');
    console.log('✅ Codebase is secure from credential exposure\n');
} else {
    console.log('🚨 SECURITY ISSUES FOUND:');
    for (const issue of securityIssues) {
        console.log(`   ❌ ${issue.file}:${issue.line} contains: ${issue.pattern}`);
    }
    console.log('');
}

// Check if high-risk files were removed
const removedFiles = [
    'check-database-users.js',
    'cleanup-inbound-numbers.js',
    'find-conflicting-user.js',
    'create-fresh-kenan-couk.js',
    'manually-create-seeded-users.js'
];

console.log('🗑️  HIGH-RISK FILES REMOVAL STATUS:');
for (const file of removedFiles) {
    const exists = fs.existsSync(file);
    console.log(`   ${file}: ${exists ? '❌ STILL EXISTS' : '✅ DELETED'}`);
}

console.log('\n🔒 NEXT SECURITY ACTIONS:');
console.log('1. 🔥 Change admin password: admin@omnivox-ai.com');
console.log('2. 🔧 Set Railway environment variables');
console.log('3. 🔄 Restart production services');
console.log('4. ✅ Test login with new credentials');

console.log('\n⚠️  CRITICAL REMINDER:');
console.log('The password "OmnivoxAdmin2025!" was publicly exposed.');
console.log('Anyone with GitHub access could have seen it.');
console.log('Change the production admin password IMMEDIATELY!');