-- CreateTable
CREATE TABLE "InboundNumber" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "region" TEXT,
    "numberType" TEXT NOT NULL DEFAULT 'LOCAL',
    "provider" TEXT NOT NULL DEFAULT 'TWILIO',
    "capabilities" TEXT[] DEFAULT ARRAY['VOICE'],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundNumber_phoneNumber_key" ON "InboundNumber"("phoneNumber");

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "outboundNumber" TEXT;
ALTER TABLE "campaigns" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;