#!/usr/bin/env node

/**
 * EMERGENCY SECURITY CLEANUP SCRIPT
 * 
 * This script removes all hardcoded credentials from the codebase
 * and replaces them with environment variable references.
 * 
 * CRITICAL: Run this immediately to secure the system
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Hardcoded credentials to remove (SECURITY VIOLATION)
const SECURITY_VIOLATIONS = [
    { pattern: /password:\s*['"`]OmnivoxAdmin2025!['"`]/g, replacement: "password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'" },
    { pattern: /email:\s*['"`]admin@omnivox-ai\.com['"`]/g, replacement: "email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com'" },
    { pattern: /['"`]OmnivoxAdmin2025!['"`]/g, replacement: "process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'" },
    { pattern: /password:\s*['"`]KenanTest123!['"`]/g, replacement: "password: process.env.TEST_PASSWORD || 'TEST_PASSWORD_NOT_SET'" },
    { pattern: /password:\s*['"`]Kenan3477!['"`]/g, replacement: "password: process.env.USER_PASSWORD || 'USER_PASSWORD_NOT_SET'" },
    { pattern: /password:\s*['"`]KenanAlt123!['"`]/g, replacement: "password: process.env.ALT_PASSWORD || 'ALT_PASSWORD_NOT_SET'" },
    { pattern: /password:\s*['"`]ImmediateTest123!['"`]/g, replacement: "password: process.env.TEST_PASSWORD || 'TEST_PASSWORD_NOT_SET'" },
    { pattern: /const\s+token\s*=\s*['"`]eyJ[^'"`]+['"`]/g, replacement: "const token = process.env.JWT_TOKEN || 'JWT_TOKEN_NOT_SET'" }
];

// Files that should be completely removed (test files with credentials)
const FILES_TO_DELETE = [
    'check-database-users.js',
    'cleanup-inbound-numbers.js', 
    'find-conflicting-user.js',
    'create-fresh-kenan-couk.js',
    'manually-create-seeded-users.js',
    'check-kenan-user.js',
    'check-database-sync.js',
    'monitor-user-test.js',
    'test-authenticated-workflow.js',
    'setup-kennen-inbound-test.js',
    'quick-login-test.js',
    'create-test-user.js',
    'deep-debug-auth.js',
    'fix-frontend-user.js',
    'fix-username-conflict.js',
    'deep-corruption-test.js',
    'check-recent-users.js',
    'test-voice-endpoint.js',
    'fix-user-password.js',
    'simple-user-check.js'
];

async function scanAndCleanFile(filePath) {
    try {
        const content = await readFile(filePath, 'utf8');
        let cleanedContent = content;
        let hasViolations = false;

        // Check for security violations
        for (const violation of SECURITY_VIOLATIONS) {
            if (violation.pattern.test(content)) {
                hasViolations = true;
                cleanedContent = cleanedContent.replace(violation.pattern, violation.replacement);
            }
        }

        if (hasViolations) {
            console.log(`🚨 SECURITY VIOLATION FOUND IN: ${filePath}`);
            
            // Add security warning header
            const securityHeader = `/*
 * SECURITY WARNING: This file previously contained hardcoded credentials
 * Credentials have been moved to environment variables for security
 * Configure the following environment variables:
 * - ADMIN_PASSWORD
 * - ADMIN_EMAIL  
 * - TEST_PASSWORD
 * - USER_PASSWORD
 * - ALT_PASSWORD
 * - JWT_TOKEN
 */

`;
            cleanedContent = securityHeader + cleanedContent;
            
            await writeFile(filePath, cleanedContent);
            console.log(`✅ CLEANED: ${filePath}`);
        }

        return hasViolations;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

async function deleteSecurityRiskFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`🗑️  DELETED SECURITY RISK FILE: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Error deleting ${filePath}:`, error.message);
        return false;
    }
}

async function scanDirectory(dir) {
    const items = await readdir(dir);
    const results = {
        filesScanned: 0,
        violationsFound: 0,
        filesDeleted: 0
    };

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemStat = await stat(fullPath);

        if (itemStat.isFile() && item.endsWith('.js')) {
            results.filesScanned++;

            // Check if this is a file we should delete entirely
            if (FILES_TO_DELETE.includes(item)) {
                if (await deleteSecurityRiskFile(fullPath)) {
                    results.filesDeleted++;
                }
                continue;
            }

            // Otherwise scan and clean
            if (await scanAndCleanFile(fullPath)) {
                results.violationsFound++;
            }
        }
    }

    return results;
}

async function createSecureEnvTemplate() {
    const secureEnvContent = `# EMERGENCY SECURITY CONFIGURATION
# These environment variables MUST be set for the system to work securely
# NEVER commit actual passwords to version control

# Admin Credentials (CHANGE THESE IMMEDIATELY)
ADMIN_EMAIL=admin@omnivox-ai.com
ADMIN_PASSWORD=CHANGE_THIS_SECURE_ADMIN_PASSWORD_IMMEDIATELY

# Test Credentials (for development only)
TEST_PASSWORD=CHANGE_THIS_TEST_PASSWORD
USER_PASSWORD=CHANGE_THIS_USER_PASSWORD  
ALT_PASSWORD=CHANGE_THIS_ALT_PASSWORD

# JWT Token (generate new secure token)
JWT_TOKEN=GENERATE_NEW_SECURE_JWT_TOKEN

# Backend Configuration
BACKEND_URL=https://froniterai-production.up.railway.app
NEXT_PUBLIC_API_URL=https://froniterai-production.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://froniterai-production.up.railway.app

# CRITICAL SECURITY NOTES:
# 1. Change all passwords marked "CHANGE_THIS" immediately
# 2. Use strong, randomly generated passwords
# 3. Never commit this file with actual passwords
# 4. Set these as environment variables in your deployment platform
`;

    await writeFile(path.join(__dirname, '.env.security'), secureEnvContent);
    console.log('📝 Created secure environment template: .env.security');
}

async function main() {
    console.log('🚨 EMERGENCY SECURITY CLEANUP STARTING...\n');
    console.log('This will remove ALL hardcoded credentials from the codebase\n');
    
    const results = await scanDirectory(__dirname);
    
    console.log('\n📊 SECURITY CLEANUP RESULTS:');
    console.log(`   Files scanned: ${results.filesScanned}`);
    console.log(`   Security violations found: ${results.violationsFound}`);
    console.log(`   High-risk files deleted: ${results.filesDeleted}`);
    
    await createSecureEnvTemplate();
    
    console.log('\n🔒 NEXT SECURITY STEPS:');
    console.log('1. 🔥 IMMEDIATELY change admin password in production');
    console.log('2. 📝 Configure environment variables from .env.security');
    console.log('3. 🚫 Add .env* to .gitignore');
    console.log('4. 📤 Commit and push these security fixes');
    console.log('5. 🔄 Regenerate all API tokens and secrets');
    console.log('\n⚠️  CRITICAL: Your admin credentials were publicly exposed!');
    console.log('   Email: admin@omnivox-ai.com');  
    console.log('   Password: OmnivoxAdmin2025! (CHANGE THIS NOW!)');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { scanAndCleanFile, deleteSecurityRiskFile };