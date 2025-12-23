-- Add missing columns to Campaign table for outbound number and activation status
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "outboundNumber" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT FALSE;

-- Create InboundNumber table for CLI selection
CREATE TABLE IF NOT EXISTS "InboundNumber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL UNIQUE,
    "displayName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "numberType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "capabilities" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default inbound numbers for CLI selection
INSERT INTO "InboundNumber" (id, "phoneNumber", "displayName", country, region, "numberType", provider, capabilities, "isActive") 
VALUES 
    ('inbound-1', '+442046343130', 'UK Local - London', 'GB', 'London', 'LOCAL', 'TWILIO', '["VOICE","SMS"]', true),
    ('inbound-2', '+15551234567', 'US Toll-Free', 'US', 'National', 'TOLL_FREE', 'TWILIO', '["VOICE","SMS"]', true),
    ('inbound-3', '+447700900123', 'UK Mobile', 'GB', 'National', 'MOBILE', 'TWILIO', '["VOICE","SMS","MMS"]', true),
    ('inbound-4', '+14155552456', 'US Local - San Francisco', 'US', 'San Francisco', 'LOCAL', 'TWILIO', '["VOICE","SMS"]', true)
ON CONFLICT ("phoneNumber") DO NOTHING;