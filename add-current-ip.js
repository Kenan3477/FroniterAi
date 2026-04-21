/**
 * Add IP 162.120.188.145 to whitelist
 * Ken's current location - April 21, 2026
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCurrentLocationIP() {
  try {
    console.log('🔐 Adding current location IP to whitelist...');

    // Check if table exists first
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ip_whitelist'
      );
    `;
    
    console.log('📋 Table check:', tableCheck);

    if (!tableCheck[0]?.exists) {
      console.log('⚠️  ip_whitelist table does not exist in database');
      console.log('✅ Frontend whitelist updated - IP will work after Vercel deployment');
      await prisma.$disconnect();
      return;
    }

    // Add new IP using raw SQL
    await prisma.$executeRaw`
      INSERT INTO ip_whitelist (id, ip_address, name, description, added_by, added_at, is_active, activity_count)
      VALUES (
        gen_random_uuid()::text,
        '162.120.188.145',
        'Ken Current Location IP',
        'Ken current location IP - Added April 21, 2026',
        'system',
        NOW(),
        true,
        0
      )
      ON CONFLICT (ip_address) 
      DO UPDATE SET 
        is_active = true,
        name = 'Ken Current Location IP',
        description = 'Ken current location IP - Added April 21, 2026',
        updated_at = NOW()
    `;

    console.log('✅ IP added to database whitelist');

    // Show all whitelisted IPs
    const allIPs = await prisma.$queryRaw`
      SELECT ip_address, name, added_at 
      FROM ip_whitelist 
      WHERE is_active = true 
      ORDER BY added_at DESC
    `;

    console.log('\n📋 All active whitelisted IPs:');
    allIPs.forEach(ip => {
      console.log(`  - ${ip.ip_address} (${ip.name})`);
    });

    await prisma.$disconnect();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addCurrentLocationIP();
