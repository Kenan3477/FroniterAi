-- CreateTable
CREATE TABLE "inbound_numbers" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "numberType" TEXT NOT NULL DEFAULT 'LOCAL',
    "provider" TEXT NOT NULL DEFAULT 'TWILIO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_lists" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campaignId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "blendWeight" INTEGER,
    "totalContacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT,
    "title" TEXT,
    "phone" TEXT NOT NULL,
    "mobile" TEXT,
    "workPhone" TEXT,
    "homePhone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "industry" TEXT,
    "address" TEXT,
    "address2" TEXT,
    "address3" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "website" TEXT,
    "linkedIn" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "leadSource" TEXT,
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "deliveryDate" TIMESTAMP(3),
    "ageRange" TEXT,
    "residentialStatus" TEXT,
    "custom1" TEXT,
    "custom2" TEXT,
    "custom3" TEXT,
    "custom4" TEXT,
    "custom5" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAgentId" TEXT,
    "lastOutcome" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lastAttempt" TIMESTAMP(3),
    "nextAttempt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dial_queue" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "assignedAgentId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dialedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,

    CONSTRAINT "dial_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dialMethod" TEXT NOT NULL DEFAULT 'Progressive',
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "dropPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'Inactive',
    "description" TEXT,
    "maxLines" INTEGER,
    "dialRatio" DOUBLE PRECISION,
    "recordCalls" BOOLEAN NOT NULL DEFAULT false,
    "allowTransfers" BOOLEAN NOT NULL DEFAULT false,
    "campaignScript" TEXT,
    "fieldMapping" TEXT,
    "retrySettings" TEXT,
    "hoursOfOperation" TEXT,
    "abandonRateThreshold" DOUBLE PRECISION DEFAULT 0.05,
    "pacingMultiplier" DOUBLE PRECISION DEFAULT 1.0,
    "maxCallsPerAgent" INTEGER DEFAULT 1,
    "outboundNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable  
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'agent',
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbound_numbers_phoneNumber_key" ON "inbound_numbers"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "data_lists_listId_key" ON "data_lists"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_contactId_key" ON "contacts"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "dial_queue_queueId_key" ON "dial_queue"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_campaignId_key" ON "Campaign"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_listId_fkey" FOREIGN KEY ("listId") REFERENCES "data_lists"("listId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dial_queue" ADD CONSTRAINT "dial_queue_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("contactId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dial_queue" ADD CONSTRAINT "dial_queue_listId_fkey" FOREIGN KEY ("listId") REFERENCES "data_lists"("listId") ON DELETE CASCADE ON UPDATE CASCADE;