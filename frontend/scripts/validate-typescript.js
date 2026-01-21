#!/usr/bin/env node

/**
 * TypeScript Validation Script for Vercel Deployment
 * 
 * This script validates that all TypeScript files have proper type annotations
 * to prevent Vercel deployment failures due to implicit 'any' types.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating TypeScript for Vercel deployment...\n');

// Function to find all TypeScript files
function findTSFiles(dir, files = []) {
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      findTSFiles(fullPath, files);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to check for implicit any types
function checkForImplicitAny(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Common patterns that cause implicit any
  const patterns = [
    {
      regex: /\.(forEach|map|filter|reduce)\(\s*\([^)]*\)\s*=>/g,
      check: (match) => {
        // Check if parameters have type annotations
        const params = match.match(/\(\s*([^)]*)\s*\)/)[1];
        if (params && !params.includes(':') && params.length > 0) {
          return true;
        }
        return false;
      },
      message: 'Callback function parameter missing type annotation'
    }
  ];
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of patterns) {
      const matches = [...line.matchAll(pattern.regex)];
      
      for (const match of matches) {
        if (pattern.check(match[0])) {
          issues.push({
            line: i + 1,
            content: line.trim(),
            message: pattern.message
          });
        }
      }
    }
  }
  
  return issues;
}

// Main validation
try {
  console.log('📁 Scanning TypeScript files...');
  const tsFiles = findTSFiles('./src');
  console.log(`Found ${tsFiles.length} TypeScript files\n`);
  
  let totalIssues = 0;
  
  for (const file of tsFiles) {
    const issues = checkForImplicitAny(file);
    
    if (issues.length > 0) {
      console.log(`❌ ${file}:`);
      for (const issue of issues) {
        console.log(`   Line ${issue.line}: ${issue.message}`);
        console.log(`   Code: ${issue.content}`);
      }
      console.log('');
      totalIssues += issues.length;
    }
  }
  
  if (totalIssues === 0) {
    console.log('✅ All TypeScript files look good!');
    console.log('🚀 Ready for Vercel deployment\n');
  } else {
    console.log(`❌ Found ${totalIssues} potential issues`);
    console.log('⚠️  Please fix these issues before deploying to Vercel\n');
  }
  
  // Run TypeScript compiler check
  console.log('🔧 Running TypeScript compiler check...');
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation check passed');
  } catch (error) {
    console.log('❌ TypeScript compilation errors:');
    console.log(error.stdout.toString());
    process.exit(1);
  }
  
  if (totalIssues > 0) {
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}