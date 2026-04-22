/**
 * Quick Database Query - Check Campaigns
 * Uses direct pg query to avoid Prisma client issues
 */

const { Client } = require('pg');

// Get database URL from backend .env or use local database
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://zenan:@localhost:5432/omnivox_dev';

async function checkCampaigns() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    console.log('\n🔍 CHECKING CAMPAIGNS IN DATABASE');
    console.log('═══════════════════════════════════════════════════\n');

    // Check campaigns
    const campaignResult = await client.query(`
      SELECT "campaignId", name, status, "createdAt"
      FROM campaigns
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    console.log(`📊 Found ${campaignResult.rows.length} campaigns:\n`);

    if (campaignResult.rows.length > 0) {
      campaignResult.rows.forEach((campaign, idx) => {
        console.log(`Campaign #${idx + 1}:`);
        console.log(`  ID:      ${campaign.campaignId}`);
        console.log(`  Name:    ${campaign.name}`);
        console.log(`  Status:  ${campaign.status}`);
        console.log(`  Created: ${campaign.createdAt}`);
        console.log('');
      });
    }

    // Check call records count
    const callRecordsResult = await client.query(`
      SELECT COUNT(*) as count FROM call_records
    `);
    console.log(`📞 Total call records: ${callRecordsResult.rows[0].count}\n`);

    // Check contacts count
    const contactsResult = await client.query(`
      SELECT COUNT(*) as count FROM contacts
    `);
    console.log(`📇 Total contacts: ${contactsResult.rows[0].count}\n`);

    // Check agents count
    const agentsResult = await client.query(`
      SELECT COUNT(*) as count FROM agents
    `);
    console.log(`👥 Total agents: ${agentsResult.rows[0].count}\n`);

    console.log('✅ Database connection successful!');
    console.log(`   Use campaign ID "${campaignResult.rows[0]?.campaignId}" for importing calls\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkCampaigns();
