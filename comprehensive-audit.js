#!/usr/bin/env node

/**
 * Comprehensive Database vs Schema Audit
 * This identifies exactly which tables need to be added to prevent data loss
 */

const { PrismaClient } = require('@prisma/client');

async function comprehensiveAudit() {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🔍 COMPREHENSIVE DATABASE AUDIT\n');

    // Get actual database tables
    const tableResult = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    const actualTables = tableResult.map(row => row.tablename);

    // Define tables that are in the current Prisma schema (based on @@map directives)
    const schemasTableMappings = {
      'DataList': 'data_lists',
      'Contact': 'contacts',
      'DialQueueEntry': 'dial_queue',
      'Campaign': 'campaigns',
      'Agent': 'agents',
      'AgentCampaignAssignment': 'agent_campaign_assignments',
      'WorkItem': 'work_items',
      'Disposition': 'dispositions',
      'CampaignDisposition': 'campaign_dispositions',
      'CallKPI': 'call_kpis',
      'CallRecord': 'call_records',
      'Interaction': 'interactions',
      'Sale': 'sales',
      'Task': 'tasks',
      'User': 'users',
      'UserCampaignAssignment': 'user_campaign_assignments',
      'RefreshToken': 'refresh_tokens',
      'Flow': 'flows',
      'FlowVersion': 'flow_versions',
      'FlowNode': 'flow_nodes',
      'FlowEdge': 'flow_edges',
      'NodeTypeDefinition': 'node_type_definitions',
      'FlowRun': 'flow_runs',
      'FlowRunStep': 'flow_run_steps',
      'Organization': 'organizations',
      'Team': 'teams',
      'Role': 'roles',
      'Channel': 'channels',
      'ChannelRoute': 'channel_routes',
      'ChannelConfiguration': 'channel_configurations',
      'ChannelSchedule': 'channel_schedules',
      'ChannelCapacity': 'channel_capacities',
      'ChannelAssignment': 'channel_assignments',
      'ChannelMetrics': 'channel_metrics',
      'ChannelActivity': 'channel_activities',
      'Integration': 'integrations',
      'IntegrationLog': 'integration_logs',
      'Webhook': 'webhooks',
      'WebhookDelivery': 'webhook_deliveries',
      'Recording': 'recordings',
      'Transcription': 'transcriptions',
      'Notification': 'notifications',
      'SystemAlert': 'system_alerts',
      'InboundNumber': 'inbound_numbers',
      'InboundQueue': 'inbound_queues',
      'AuditLog': 'audit_logs',
      'EmailVerification': 'email_verifications'
    };

    const schemaTablesSet = new Set(Object.values(schemasTableMappings));

    console.log('📊 DATABASE TABLES: ' + actualTables.length);
    console.log('📊 SCHEMA MODELS: ' + Object.keys(schemasTableMappings).length);

    // Find undefined tables (in database but not in schema)
    const undefinedTables = actualTables.filter(table => 
      !schemaTablesSet.has(table) && table !== '_prisma_migrations'
    );

    console.log('\n⚠️ UNDEFINED TABLES (Risk of data loss):');
    if (undefinedTables.length === 0) {
      console.log('✅ No undefined tables found!');
    } else {
      console.log(`❌ Found ${undefinedTables.length} undefined tables:`);
      for (const table of undefinedTables) {
        try {
          const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
          const count = countResult[0].count;
          console.log(`  - ${table} (${count} rows)`);
        } catch (error) {
          console.log(`  - ${table} (count failed: ${error.message.split(' ')[0]})`);
        }
      }
    }

    // Find missing tables (in schema but not in database)
    const missingTables = Object.values(schemasTableMappings).filter(table => 
      !actualTables.includes(table)
    );

    console.log('\n❌ MISSING TABLES (Schema expects but DB missing):');
    if (missingTables.length === 0) {
      console.log('✅ All schema tables exist in database!');
    } else {
      console.log(`❌ Found ${missingTables.length} missing tables:`);
      missingTables.forEach(table => {
        console.log(`  - ${table}`);
      });
    }

    console.log('\n🔍 HIGH-RISK TABLES WITH DATA:');
    const highRiskTables = [];
    for (const table of undefinedTables) {
      try {
        const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = parseInt(countResult[0].count);
        if (count > 0) {
          highRiskTables.push({ table, count });
        }
      } catch (error) {
        // Skip tables we can't count
      }
    }

    if (highRiskTables.length > 0) {
      console.log('⚠️ IMMEDIATE ACTION REQUIRED - These tables have data but no schema definition:');
      highRiskTables.forEach(({ table, count }) => {
        console.log(`  🚨 ${table}: ${count} rows of data at risk`);
      });
    } else {
      console.log('✅ No high-risk tables found');
    }

    console.log('\n📋 RECOMMENDATIONS:');
    if (undefinedTables.length > 0) {
      console.log('1. 🛑 DO NOT run "npx prisma db push" until all tables are defined');
      console.log('2. ➕ Add missing table models to schema.prisma');
      console.log('3. 🔍 Use "npx prisma db pull" to reverse-engineer missing models');
      console.log('4. ✅ Verify all tables are defined before any schema changes');
    } else {
      console.log('✅ All tables are properly defined - safe to proceed');
    }

  } catch (error) {
    console.error('❌ Error during audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the comprehensive audit
comprehensiveAudit().catch(console.error);