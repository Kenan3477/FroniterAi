/**
 * Add IP Whitelist Entry for Dan Hill
 * Adds IP 145.224.65.166 to the whitelist
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

async function addIPWhitelist() {
  try {
    console.log('🔐 Adding IP whitelist entry for Dan Hill...');
    console.log('📍 IP Address: 145.224.65.166');
    
    const response = await fetch(`${BACKEND_URL}/api/ip-whitelist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Using system token - you may need to use admin credentials
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'system-token'}`
      },
      body: JSON.stringify({
        ipAddress: '145.224.65.166',
        description: 'Dan Hill - Agent access',
        userId: null, // Can be set to Dan Hill's user ID if you have it
        isActive: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ IP whitelist entry added successfully:', data);
    } else {
      const error = await response.text();
      console.error('❌ Failed to add IP whitelist:', response.status, error);
      console.log('');
      console.log('💡 Alternative: Add directly to database:');
      console.log('');
      console.log(`INSERT INTO public."IPWhitelist" ("ipAddress", "userId", "description", "isActive", "createdAt", "lastUsedAt") VALUES ('145.224.65.166', NULL, 'Dan Hill - Agent access', true, NOW(), NOW());`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
    console.log('💡 Add directly to database using Railway PostgreSQL:');
    console.log('');
    console.log(`INSERT INTO public."IPWhitelist" ("ipAddress", "userId", "description", "isActive", "createdAt", "lastUsedAt") VALUES ('145.224.65.166', NULL, 'Dan Hill - Agent access', true, NOW(), NOW());`);
  }
}

addIPWhitelist();
