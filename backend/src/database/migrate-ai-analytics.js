/**
 * AI Analytics Migration Script
 * Applies advanced AI dialler analytics schema to Railway production database
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function migrateAIAnalytics() {
  console.log('🚀 Starting AI Analytics Schema Migration...');

  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Connected to Railway database');

    // Apply the AI analytics schema migration
    console.log('📊 Creating AI Analytics tables...');

    // Create enums first
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "DispositionType" AS ENUM ('SALE', 'NO_SALE', 'CALLBACK', 'NOT_INTERESTED', 'BUSY', 'NO_ANSWER', 'VOICEMAIL', 'WRONG_NUMBER', 'DNC', 'APPOINTMENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "SpeechPace" AS ENUM ('VERY_SLOW', 'SLOW', 'NORMAL', 'FAST', 'VERY_FAST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "ComplianceEventType" AS ENUM ('ABANDONED_CALL', 'DNC_VIOLATION', 'CALL_TIME_VIOLATION', 'SCRIPT_DEVIATION', 'RECORDING_FAILURE', 'CONSENT_VIOLATION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log('✅ Enums created successfully');

    // Create CallDisposition table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "CallDisposition" (
        "dispositionId" TEXT NOT NULL,
        "callId" TEXT NOT NULL,
        "disposition" "DispositionType" NOT NULL,
        "notes" TEXT,
        "sentimentScore" DOUBLE PRECISION,
        "confidenceScore" DOUBLE PRECISION,
        "tags" TEXT[],
        "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
        "followUpDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "CallDisposition_pkey" PRIMARY KEY ("dispositionId")
      );
    `;

    // Create DiallerMetrics table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "DiallerMetrics" (
        "metricId" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "campaignId" TEXT,
        "agentId" TEXT,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "pacingRatio" DOUBLE PRECISION NOT NULL,
        "abandonedCallRate" DOUBLE PRECISION NOT NULL,
        "agentUtilization" DOUBLE PRECISION NOT NULL,
        "averageSpeedAnswer" INTEGER NOT NULL,
        "contactRate" DOUBLE PRECISION NOT NULL,
        "rightPartyRate" DOUBLE PRECISION NOT NULL,

        CONSTRAINT "DiallerMetrics_pkey" PRIMARY KEY ("metricId")
      );
    `;

    // Create ConversationAnalysis table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ConversationAnalysis" (
        "analysisId" TEXT NOT NULL,
        "callId" TEXT NOT NULL,
        "sentimentScore" DOUBLE PRECISION,
        "talkTime" INTEGER NOT NULL,
        "listenTime" INTEGER NOT NULL,
        "interruptionCount" INTEGER NOT NULL DEFAULT 0,
        "speechPace" "SpeechPace",
        "keyTopics" TEXT[],
        "objectionTypes" TEXT[],
        "leadScore" INTEGER,
        "conversionProb" DOUBLE PRECISION,
        "nextBestAction" TEXT,
        "coachingNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ConversationAnalysis_pkey" PRIMARY KEY ("analysisId")
      );
    `;

    // Create CampaignAnalytics table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "CampaignAnalytics" (
        "analyticsId" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "campaignId" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "totalCalls" INTEGER NOT NULL DEFAULT 0,
        "contactRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "averageCallDuration" INTEGER NOT NULL DEFAULT 0,
        "roi" DOUBLE PRECISION,
        "costPerLead" DOUBLE PRECISION,
        "revenue" DOUBLE PRECISION,

        CONSTRAINT "CampaignAnalytics_pkey" PRIMARY KEY ("analyticsId")
      );
    `;

    // Create ComplianceEvent table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ComplianceEvent" (
        "eventId" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "eventType" "ComplianceEventType" NOT NULL,
        "severity" "Severity" NOT NULL,
        "description" TEXT NOT NULL,
        "callId" TEXT,
        "agentId" TEXT,
        "resolved" BOOLEAN NOT NULL DEFAULT false,
        "resolvedAt" TIMESTAMP(3),
        "resolvedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ComplianceEvent_pkey" PRIMARY KEY ("eventId")
      );
    `;

    console.log('✅ Tables created successfully');

    // Create indexes for performance
    console.log('📈 Creating indexes for performance...');

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "CallDisposition_callId_idx" ON "CallDisposition"("callId");
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "CallDisposition_callId_key" ON "CallDisposition"("callId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "DiallerMetrics_organizationId_idx" ON "DiallerMetrics"("organizationId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "DiallerMetrics_campaignId_idx" ON "DiallerMetrics"("campaignId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "DiallerMetrics_timestamp_idx" ON "DiallerMetrics"("timestamp");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ConversationAnalysis_callId_idx" ON "ConversationAnalysis"("callId");
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "ConversationAnalysis_callId_key" ON "ConversationAnalysis"("callId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "CampaignAnalytics_organizationId_idx" ON "CampaignAnalytics"("organizationId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "CampaignAnalytics_campaignId_idx" ON "CampaignAnalytics"("campaignId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "CampaignAnalytics_date_idx" ON "CampaignAnalytics"("date");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ComplianceEvent_organizationId_idx" ON "ComplianceEvent"("organizationId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ComplianceEvent_eventType_idx" ON "ComplianceEvent"("eventType");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ComplianceEvent_severity_idx" ON "ComplianceEvent"("severity");
    `;

    console.log('✅ Indexes created successfully');

    // Add foreign key constraints (if tables exist)
    console.log('🔗 Adding foreign key constraints...');

    // Check if CallRecord table exists
    const callRecordExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'CallRecord'
      );
    `;

    if (callRecordExists[0]?.exists) {
      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "CallDisposition" ADD CONSTRAINT "CallDisposition_callId_fkey" FOREIGN KEY ("callId") REFERENCES "CallRecord"("callId") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "ConversationAnalysis" ADD CONSTRAINT "ConversationAnalysis_callId_fkey" FOREIGN KEY ("callId") REFERENCES "CallRecord"("callId") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;
    }

    // Check if Organization table exists
    const organizationExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Organization'
      );
    `;

    if (organizationExists[0]?.exists) {
      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "DiallerMetrics" ADD CONSTRAINT "DiallerMetrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "CampaignAnalytics" ADD CONSTRAINT "CampaignAnalytics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "ComplianceEvent" ADD CONSTRAINT "ComplianceEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;
    }

    console.log('✅ Foreign key constraints added successfully');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('CallDisposition', 'DiallerMetrics', 'ConversationAnalysis', 'CampaignAnalytics', 'ComplianceEvent')
      ORDER BY table_name;
    `;

    console.log('📋 Created tables:', tables);

    console.log('🎉 AI Analytics Schema Migration completed successfully!');

    return {
      success: true,
      tablesCreated: tables.length,
      message: 'AI analytics schema migration completed successfully'
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  migrateAIAnalytics()
    .then((result) => {
      console.log('Migration result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAIAnalytics };