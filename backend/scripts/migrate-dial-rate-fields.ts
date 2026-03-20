/**
 * Database Migration: Add Real-Time Dial Rate and Routing Configuration
 * Adds new columns to campaigns table for dial rate control
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function addDialRateFields() {
  console.log('🔄 Adding dial rate and routing configuration fields to campaigns...');

  try {
    // Check if fields already exist
    const existingCampaign = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' 
      AND column_name IN ('dialRate', 'predictiveRatio', 'routingStrategy')
    `;

    if (Array.isArray(existingCampaign) && existingCampaign.length > 0) {
      console.log('⚠️  Dial rate fields already exist, skipping migration');
      return;
    }

    // Add new columns with proper defaults
    await prisma.$executeRaw`
      ALTER TABLE "campaigns" 
      ADD COLUMN IF NOT EXISTS "dialRate" DOUBLE PRECISION DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS "predictiveRatio" DOUBLE PRECISION DEFAULT 1.2,
      ADD COLUMN IF NOT EXISTS "minWaitTime" INTEGER DEFAULT 500,
      ADD COLUMN IF NOT EXISTS "maxWaitTime" INTEGER DEFAULT 5000,
      ADD COLUMN IF NOT EXISTS "answerRateTarget" DOUBLE PRECISION DEFAULT 0.8,
      ADD COLUMN IF NOT EXISTS "dropRateLimit" DOUBLE PRECISION DEFAULT 0.03,
      ADD COLUMN IF NOT EXISTS "routingStrategy" VARCHAR(50) DEFAULT 'ROUND_ROBIN',
      ADD COLUMN IF NOT EXISTS "priorityRouting" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "agentIdleTimeout" INTEGER DEFAULT 30000,
      ADD COLUMN IF NOT EXISTS "callbackDelay" INTEGER DEFAULT 300000,
      ADD COLUMN IF NOT EXISTS "retryStrategy" VARCHAR(50) DEFAULT 'LINEAR'
    `;

    console.log('✅ Successfully added dial rate configuration fields');

    // Update existing campaigns with default values
    const campaignCount = await prisma.campaign.count();
    console.log(`📊 Updating ${campaignCount} existing campaigns with default dial rate settings...`);

    await prisma.campaign.updateMany({
      data: {
        dialRate: 1.0,
        predictiveRatio: 1.2,
        minWaitTime: 500,
        maxWaitTime: 5000,
        answerRateTarget: 0.8,
        dropRateLimit: 0.03,
        routingStrategy: 'ROUND_ROBIN',
        priorityRouting: false,
        agentIdleTimeout: 30000,
        callbackDelay: 300000,
        retryStrategy: 'LINEAR'
      }
    });

    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error in dial rate migration:', error);
    throw error;
  }
}

export async function removeDialRateFields() {
  console.log('🔄 Removing dial rate configuration fields from campaigns...');

  try {
    await prisma.$executeRaw`
      ALTER TABLE "campaigns" 
      DROP COLUMN IF EXISTS "dialRate",
      DROP COLUMN IF EXISTS "predictiveRatio",
      DROP COLUMN IF EXISTS "minWaitTime",
      DROP COLUMN IF EXISTS "maxWaitTime",
      DROP COLUMN IF EXISTS "answerRateTarget",
      DROP COLUMN IF EXISTS "dropRateLimit",
      DROP COLUMN IF EXISTS "routingStrategy",
      DROP COLUMN IF EXISTS "priorityRouting",
      DROP COLUMN IF EXISTS "agentIdleTimeout",
      DROP COLUMN IF EXISTS "callbackDelay",
      DROP COLUMN IF EXISTS "retryStrategy"
    `;

    console.log('✅ Successfully removed dial rate configuration fields');

  } catch (error) {
    console.error('❌ Error removing dial rate fields:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addDialRateFields()
    .then(() => {
      console.log('🎯 Dial rate migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}