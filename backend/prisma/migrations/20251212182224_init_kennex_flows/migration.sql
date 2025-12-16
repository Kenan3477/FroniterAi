-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "flows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "flows_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "flow_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    CONSTRAINT "flow_versions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "flow_nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowVersionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "isEntry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "flow_nodes_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "flow_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "flow_edges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowVersionId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "sourcePort" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flow_edges_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "flow_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "node_type_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "schema" TEXT NOT NULL DEFAULT '{}',
    "ports" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "flow_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowVersionId" TEXT NOT NULL,
    "externalRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "context" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    CONSTRAINT "flow_runs_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "flow_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "flow_run_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowRunId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "nodeLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "input" TEXT NOT NULL DEFAULT '{}',
    "output" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    CONSTRAINT "flow_run_steps_flowRunId_fkey" FOREIGN KEY ("flowRunId") REFERENCES "flow_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "flow_versions_flowId_versionNumber_key" ON "flow_versions"("flowId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "node_type_definitions_type_key" ON "node_type_definitions"("type");
