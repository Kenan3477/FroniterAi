-- CreateTable
CREATE TABLE "dialler_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "extension" TEXT,
    "sipUsername" TEXT,
    "sipPassword" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "currentStatus" TEXT NOT NULL DEFAULT 'OFFLINE',
    "currentCampaignId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dialler_agents_currentCampaignId_fkey" FOREIGN KEY ("currentCampaignId") REFERENCES "dialler_campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_status_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "campaignId" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "sessionData" TEXT,
    CONSTRAINT "agent_status_history_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "dialler_agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agent_status_history_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "dialler_campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dialler_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "diallingMode" TEXT NOT NULL DEFAULT 'POWER',
    "outboundCli" TEXT NOT NULL,
    "maxCallsPerAgent" INTEGER NOT NULL DEFAULT 1,
    "maxAttemptsPerRecord" INTEGER NOT NULL DEFAULT 3,
    "abandonRateThreshold" REAL NOT NULL DEFAULT 0.05,
    "pacingMultiplier" REAL NOT NULL DEFAULT 1.0,
    "acwRequired" BOOLEAN NOT NULL DEFAULT true,
    "acwTimeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "diallingStart" TEXT,
    "diallingEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "dialler_campaigns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "campaign_agents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "dialler_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_agents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "dialler_agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "completedRecords" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaign_lists_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "dialler_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignListId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "company" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" DATETIME,
    "nextAttemptAt" DATETIME,
    "lastOutcome" TEXT,
    "isDnc" BOOLEAN NOT NULL DEFAULT false,
    "dncDate" DATETIME,
    "metadata" TEXT,
    "customFields" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaign_records_campaignListId_fkey" FOREIGN KEY ("campaignListId") REFERENCES "campaign_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dialler_calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "recordId" TEXT,
    "callDirection" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ringStartTime" DATETIME,
    "answerTime" DATETIME,
    "endTime" DATETIME,
    "duration" INTEGER,
    "talkTime" INTEGER,
    "sipCallId" TEXT,
    "sipSessionId" TEXT,
    "hangupCause" TEXT,
    "sipResponseCode" INTEGER,
    "recordingUrl" TEXT,
    "recordingId" TEXT,
    "recordingDuration" INTEGER,
    "cost" REAL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    CONSTRAINT "dialler_calls_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "dialler_campaigns" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dialler_calls_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "campaign_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "call_legs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "agentId" TEXT,
    "legType" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ringStartTime" DATETIME,
    "answerTime" DATETIME,
    "endTime" DATETIME,
    "duration" INTEGER,
    "sipLegId" TEXT,
    "sipEndpoint" TEXT,
    "hangupCause" TEXT,
    CONSTRAINT "call_legs_callId_fkey" FOREIGN KEY ("callId") REFERENCES "dialler_calls" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "call_legs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "dialler_agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "disposition_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isSystemCode" BOOLEAN NOT NULL DEFAULT false,
    "requiresNotes" BOOLEAN NOT NULL DEFAULT false,
    "schedulesCallback" BOOLEAN NOT NULL DEFAULT false,
    "marksDnc" BOOLEAN NOT NULL DEFAULT false,
    "isSuccessful" BOOLEAN NOT NULL DEFAULT false,
    "isContactable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "dispositions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "recordId" TEXT,
    "agentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "notes" TEXT,
    "scheduledCallback" DATETIME,
    "followUpDate" DATETIME,
    "acwDuration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispositions_callId_fkey" FOREIGN KEY ("callId") REFERENCES "dialler_calls" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispositions_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "campaign_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "dispositions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "dialler_agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispositions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "disposition_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "agentId" TEXT,
    "snapshotDate" DATETIME NOT NULL,
    "snapshotHour" INTEGER,
    "callsAttempted" INTEGER NOT NULL DEFAULT 0,
    "callsConnected" INTEGER NOT NULL DEFAULT 0,
    "callsAnswered" INTEGER NOT NULL DEFAULT 0,
    "callsAbandoned" INTEGER NOT NULL DEFAULT 0,
    "callsFailed" INTEGER NOT NULL DEFAULT 0,
    "totalDialTime" INTEGER NOT NULL DEFAULT 0,
    "totalTalkTime" INTEGER NOT NULL DEFAULT 0,
    "totalRingTime" INTEGER NOT NULL DEFAULT 0,
    "totalAcwTime" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "appointments" INTEGER NOT NULL DEFAULT 0,
    "callbacks" INTEGER NOT NULL DEFAULT 0,
    "dncRequests" INTEGER NOT NULL DEFAULT 0,
    "connectRate" REAL,
    "conversionRate" REAL,
    "averageHandlingTime" REAL,
    "averageTalkTime" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "dialler_agents_email_key" ON "dialler_agents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_agents_campaignId_agentId_key" ON "campaign_agents"("campaignId", "agentId");

-- CreateIndex
CREATE INDEX "campaign_records_status_priority_idx" ON "campaign_records"("status", "priority");

-- CreateIndex
CREATE INDEX "campaign_records_phoneNumber_idx" ON "campaign_records"("phoneNumber");

-- CreateIndex
CREATE INDEX "dialler_calls_campaignId_startTime_idx" ON "dialler_calls"("campaignId", "startTime");

-- CreateIndex
CREATE INDEX "dialler_calls_status_idx" ON "dialler_calls"("status");

-- CreateIndex
CREATE UNIQUE INDEX "disposition_categories_code_key" ON "disposition_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_snapshots_campaignId_agentId_snapshotDate_snapshotHour_key" ON "kpi_snapshots"("campaignId", "agentId", "snapshotDate", "snapshotHour");
