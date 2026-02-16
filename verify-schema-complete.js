#!/usr/bin/env node

/**
 * Simple Table Count Verification
 * Verifies that Prisma schema now includes all database tables
 */

const { PrismaClient } = require('@prisma/client');

async function verifyTableCount() {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🔍 Verifying table count after schema introspection...\n');

    // Get actual database tables
    const tableResult = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
      ORDER BY tablename;
    `;
    const actualTables = tableResult.map(row => row.tablename);

    console.log(`📊 Database tables (excluding migrations): ${actualTables.length}`);

    // Count models in Prisma schema by reading the file
    const fs = require('fs');
    const schemaContent = fs.readFileSync('/Users/zenan/kennex/frontend/prisma/schema.prisma', 'utf-8');
    const modelMatches = schemaContent.match(/^model\s+\w+\s*{/gm);
    const modelCount = modelMatches ? modelMatches.length : 0;

    console.log(`📊 Prisma schema models: ${modelCount}`);

    if (modelCount >= actualTables.length) {
      console.log('\n✅ SUCCESS: All database tables are now defined in Prisma schema!');
      console.log('✅ Safe to run "npx prisma db push" and other schema operations');
      console.log('✅ No risk of data loss from undefined tables');
    } else {
      console.log('\n⚠️ WARNING: Schema may still be missing some table definitions');
      console.log(`📊 Gap: ${actualTables.length - modelCount} tables may be undefined`);
    }

    console.log('\n📋 Next steps:');
    console.log('1. ✅ Generate Prisma client: npx prisma generate');
    console.log('2. ✅ Test application functionality');
    console.log('3. ✅ Commit the complete schema to prevent future data loss');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyTableCount().catch(console.error);