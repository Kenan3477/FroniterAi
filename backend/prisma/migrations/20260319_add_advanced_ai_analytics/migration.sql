/*
  Warnings:

  - Advanced AI Analytics Schema Extension for Omnivox-AI Dialler

*/

-- CreateEnum
CREATE TYPE "DispositionType" AS ENUM ('ANSWERED_HUMAN', 'ANSWERED_MACHINE', 'BUSY', 'NO_ANSWER', 'DISCONNECTED_NUMBER', 'CALLBACK_SCHEDULED', 'DO_NOT_CALL', 'SALE_COMPLETED', 'APPOINTMENT_SET', 'FOLLOW_UP_REQUIRED', 'INTERESTED_NOT_READY', 'NOT_INTERESTED', 'WRONG_PERSON', 'LANGUAGE_BARRIER');

-- CreateEnum
CREATE TYPE "SpeechPace" AS ENUM ('TOO_FAST', 'OPTIMAL', 'TOO_SLOW');

-- CreateEnum
CREATE TYPE "ComplianceEventType" AS ENUM ('TCPA_VIOLATION', 'CALL_TIME_VIOLATION', 'DNC_VIOLATION', 'CONSENT_MISSING', 'RECORDING_FAILURE', 'EXCESSIVE_ABANDON_RATE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "call_dispositions" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "disposition" "DispositionType" NOT NULL,
    "subDisposition" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "aiAnalysis" JSONB,
    "complianceFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialler_metrics" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT,
    "agentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "pacingRatio" DOUBLE PRECISION NOT NULL,
    "abandonedCallRate" DOUBLE PRECISION NOT NULL,
    "agentUtilization" DOUBLE PRECISION NOT NULL,
    "averageSpeedAnswer" INTEGER NOT NULL,
    "contactRate" DOUBLE PRECISION NOT NULL,
    "rightPartyRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "dialler_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_analysis" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "transcript" TEXT,
    "talkTime" INTEGER NOT NULL,
    "listenTime" INTEGER NOT NULL,
    "interruptionCount" INTEGER NOT NULL,
    "speechPace" "SpeechPace" NOT NULL,
    "keywordMatches" JSONB NOT NULL,
    "objectionHandling" JSONB NOT NULL,
    "nextBestAction" TEXT,
    "callSummary" TEXT,
    "actionItems" JSONB,
    "leadScore" DOUBLE PRECISION,
    "conversionProb" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_analytics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "diallingVelocity" INTEGER NOT NULL,
    "contactRate" DOUBLE PRECISION NOT NULL,
    "listPenetration" DOUBLE PRECISION NOT NULL,
    "timeToComplete" INTEGER,
    "recommendedTiming" JSONB,
    "listPriority" JSONB,
    "predictedROI" DOUBLE PRECISION,

    CONSTRAINT "campaign_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_events" (
    "id" TEXT NOT NULL,
    "callId" TEXT,
    "agentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "eventType" "ComplianceEventType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "description" TEXT NOT NULL,
    "autoDetected" BOOLEAN NOT NULL DEFAULT true,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_dispositions_callId_key" ON "call_dispositions"("callId");

-- CreateIndex
CREATE INDEX "call_dispositions_disposition_idx" ON "call_dispositions"("disposition");

-- CreateIndex
CREATE INDEX "call_dispositions_sentimentScore_idx" ON "call_dispositions"("sentimentScore");

-- CreateIndex
CREATE INDEX "call_dispositions_createdAt_idx" ON "call_dispositions"("createdAt");

-- CreateIndex
CREATE INDEX "dialler_metrics_timestamp_idx" ON "dialler_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "dialler_metrics_campaignId_idx" ON "dialler_metrics"("campaignId");

-- CreateIndex
CREATE INDEX "dialler_metrics_agentId_idx" ON "dialler_metrics"("agentId");

-- CreateIndex
CREATE INDEX "dialler_metrics_organizationId_idx" ON "dialler_metrics"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_analysis_callId_key" ON "conversation_analysis"("callId");

-- CreateIndex
CREATE INDEX "conversation_analysis_leadScore_idx" ON "conversation_analysis"("leadScore");

-- CreateIndex
CREATE INDEX "conversation_analysis_conversionProb_idx" ON "conversation_analysis"("conversionProb");

-- CreateIndex
CREATE INDEX "conversation_analysis_createdAt_idx" ON "conversation_analysis"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_analytics_campaignId_date_key" ON "campaign_analytics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "campaign_analytics_organizationId_idx" ON "campaign_analytics"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_analytics_date_idx" ON "campaign_analytics"("date");

-- CreateIndex
CREATE INDEX "compliance_events_organizationId_idx" ON "compliance_events"("organizationId");

-- CreateIndex
CREATE INDEX "compliance_events_eventType_idx" ON "compliance_events"("eventType");

-- CreateIndex
CREATE INDEX "compliance_events_severity_idx" ON "compliance_events"("severity");

-- CreateIndex
CREATE INDEX "compliance_events_resolved_idx" ON "compliance_events"("resolved");

-- CreateIndex
CREATE INDEX "compliance_events_createdAt_idx" ON "compliance_events"("createdAt");

-- AddForeignKey
ALTER TABLE "call_dispositions" ADD CONSTRAINT "call_dispositions_callId_fkey" FOREIGN KEY ("callId") REFERENCES "call_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialler_metrics" ADD CONSTRAINT "dialler_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_analysis" ADD CONSTRAINT "conversation_analysis_callId_fkey" FOREIGN KEY ("callId") REFERENCES "call_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_events" ADD CONSTRAINT "compliance_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;