
-- Database Security Hardening for Omnivox
-- Generated on 2026-02-18T11:49:00.795Z

-- Enable Row Level Security on sensitive tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY user_self_access ON "User" 
  FOR ALL USING (id = current_setting('app.current_user_id')::text);

-- Create audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "SecurityEvent" (type, ip, "userAgent", email, endpoint, body, severity, "createdAt")
  VALUES (
    'DATABASE_CHANGE',
    current_setting('app.client_ip', true),
    current_setting('app.user_agent', true),
    current_setting('app.user_email', true),
    TG_TABLE_NAME || '.' || TG_OP,
    row_to_json(NEW)::text,
    'MEDIUM',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to sensitive tables
CREATE TRIGGER user_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "User"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create indexes for security queries
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON "SecurityEvent" (ip);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON "SecurityEvent" (type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON "SecurityEvent" ("createdAt");

-- Create view for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  type,
  COUNT(*) as event_count,
  COUNT(DISTINCT ip) as unique_ips,
  MAX("createdAt") as last_occurrence
FROM "SecurityEvent"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY event_count DESC;
