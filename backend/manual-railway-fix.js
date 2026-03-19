// Manual Railway Database Fix Script
// Run this to get the SQL commands or endpoint setup for fixing the Railway production database

const generateFixScript = () => {
  return `
-- RAILWAY DATABASE FIX SCRIPT
-- Copy and paste this into Railway database console

-- 1. First check current state
SELECT * FROM "Organization" WHERE name = 'Omnivox';
SELECT * FROM "User" WHERE email = 'ken@simpleemails.co.uk';

-- 2. Create or update Omnivox organization
INSERT INTO "Organization" (id, name, "createdAt", "updatedAt")
VALUES ('d14a3292-0d73-4461-9f6d-ffe6a7364a5e', 'Omnivox', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "updatedAt" = NOW();

-- 3. Update user 509 to be in Omnivox organization
UPDATE "User" 
SET "organizationId" = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e'
WHERE id = 509 AND email = 'ken@simpleemails.co.uk';

-- 4. Create DAC campaign
INSERT INTO "Campaign" (id, name, description, "organizationId", "isActive", "createdAt", "updatedAt")
VALUES ('550e8400-e29b-41d4-a716-446655440004', 'DAC', 'Database Access Campaign for testing and demonstrations', 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "isActive" = true,
  "updatedAt" = NOW();

-- 5. Ensure other campaigns exist
INSERT INTO "Campaign" (id, name, description, "organizationId", "isActive", "createdAt", "updatedAt")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Customer Support Campaign', 'Inbound customer support and retention calls', 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Sales Outreach Campaign', 'Outbound sales and lead qualification calls', 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "isActive" = true,
  "updatedAt" = NOW();

-- 6. Create agent entry for user 509
INSERT INTO "Agent" (id, "userId", "extensionNumber", "status", "organizationId", "createdAt", "updatedAt")
VALUES ('user-509', 509, '1001', 'Available', 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  "extensionNumber" = '1001',
  "status" = 'Available',
  "organizationId" = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e',
  "updatedAt" = NOW();

-- 7. Assign all campaigns to user 509
INSERT INTO "AgentCampaignAssignment" ("agentId", "campaignId", "assignedAt")
VALUES 
  ('user-509', '550e8400-e29b-41d4-a716-446655440001', NOW()),
  ('user-509', '550e8400-e29b-41d4-a716-446655440002', NOW()),
  ('user-509', '550e8400-e29b-41d4-a716-446655440004', NOW())
ON CONFLICT ("agentId", "campaignId") DO NOTHING;

-- 8. Verify the fix
SELECT 'User check:' as check_type, u.id, u.email, u."organizationId", o.name as org_name
FROM "User" u
LEFT JOIN "Organization" o ON u."organizationId" = o.id
WHERE u.id = 509;

SELECT 'Campaigns check:' as check_type, c.id, c.name, c."organizationId"
FROM "Campaign" c
WHERE c."organizationId" = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';

SELECT 'Agent assignments check:' as check_type, aca."agentId", aca."campaignId", c.name as campaign_name
FROM "AgentCampaignAssignment" aca
JOIN "Campaign" c ON aca."campaignId" = c.id
WHERE aca."agentId" = 'user-509';
  `;
};

// Generate the script
const script = generateFixScript();

console.log('=== RAILWAY MANUAL DATABASE FIX ===\n');
console.log('Copy and paste this SQL into Railway database console:\n');
console.log(script);

console.log('\n=== OR CREATE TEMPORARY ENDPOINT ===');
console.log('Add this as a temporary route in your Railway backend to run the migration:');

const endpointCode = `
// Add to backend routes temporarily
app.get('/api/admin/fix-database', async (req, res) => {
  try {
    const { migrateProductionDatabase } = require('./src/database/migrate-production');
    const result = await migrateProductionDatabase();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Then call: GET https://froniterai-production.up.railway.app/api/admin/fix-database
`;

console.log(endpointCode);

console.log('\n=== EXPECTED RESULTS ===');
console.log('After running the fix:');
console.log('- User 509 will be in Omnivox organization');  
console.log('- DAC campaign will be created and visible');
console.log('- All 3 campaigns will be assigned to user 509');
console.log('- Agent assignment errors will be resolved');
console.log('- Quick Actions will load properly');