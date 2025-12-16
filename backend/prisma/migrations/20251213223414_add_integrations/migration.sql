-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "configSchema" TEXT NOT NULL,
    "iconUrl" TEXT,
    "documentationUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "integrations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "lastSyncAt" DATETIME,
    "lastError" TEXT,
    "syncCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "integration_connections_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "integration_connections_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "headers" TEXT,
    "secret" TEXT,
    "events" TEXT NOT NULL,
    "filters" TEXT,
    "template" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "retryDelay" INTEGER NOT NULL DEFAULT 5,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastFailureAt" DATETIME,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "webhooks_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "webhooks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "webhookId" TEXT NOT NULL,
    "requestUrl" TEXT NOT NULL,
    "requestMethod" TEXT NOT NULL,
    "requestHeaders" TEXT,
    "requestBody" TEXT,
    "responseStatus" INTEGER,
    "responseHeaders" TEXT,
    "responseBody" TEXT,
    "responseTime" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "eventType" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_logs_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsSuccess" INTEGER NOT NULL DEFAULT 0,
    "recordsFailure" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "duration" INTEGER,
    "summary" TEXT,
    "error" TEXT,
    CONSTRAINT "integration_sync_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
