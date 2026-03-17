#!/usr/bin/env node

/**
 * Database Table Audit
 * This script compares actual database tables with Prisma schema models
 */

const { PrismaClient } = require('@prisma/client');

async function auditDatabaseTables() {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🔍 Auditing database tables vs Prisma schema...\n');

    // Get all table names from the database
    const tableResult = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;

    console.log('📊 Actual database tables:');
    const actualTables = tableResult.map(row => row.tablename);
    actualTables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });

    console.log(`\nTotal tables in database: ${actualTables.length}`);

    // Define tables that should be in Prisma schema based on common patterns
    const expectedTables = [
      'agents',
      'campaigns', 
      'contacts',
      'data_lists',
      'dial_queue',
      'interactions',
      'users',
      'inbound_numbers',
      'inbound_queues',
      'call_records',
      'call_kpis',
      'recordings',
      'transcriptions',
      'dispositions',
      'flows',
      'flow_nodes', 
      'flow_edges',
      'webhooks',
      'notifications',
      'audit_logs',
      'system_alerts',
      'email_verifications'
    ];

    // Check for tables that might be missing from schema
    console.log('\n🔍 Checking for potentially undefined tables...');
    const undefinedTables = actualTables.filter(table => !expectedTables.includes(table));
    
    if (undefinedTables.length > 0) {
      console.log('⚠️  Tables that might not be in Prisma schema:');
      undefinedTables.forEach(table => {
        console.log(`  - ${table}`);
      });
    } else {
      console.log('✅ All tables appear to be defined');
    }

    // Check for expected tables that might be missing from database
    console.log('\n🔍 Checking for missing expected tables...');
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Expected tables missing from database:');
      missingTables.forEach(table => {
        console.log(`  - ${table}`);
      });
    } else {
      console.log('✅ All expected tables exist');
    }

    // Get table sizes to identify important tables
    console.log('\n📊 Table sizes (to identify tables with data):');
    for (const table of actualTables.slice(0, 10)) { // Check first 10 tables
      try {
        const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = countResult[0].count;
        if (count > 0) {
          console.log(`  ${table}: ${count} rows`);
        }
      } catch (error) {
        console.log(`  ${table}: Unable to count (${error.message.split('.')[0]})`);
      }
    }

  } catch (error) {
    console.error('❌ Error during audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the audit
auditDatabaseTables().catch(console.error);