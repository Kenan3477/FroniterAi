/**
 * IP Whitelist Diagnostic Tool
 * Use this to troubleshoot IP whitelist issues
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

async function diagnoseIPWhitelist() {
  console.log('\n🔍 IP WHITELIST DIAGNOSTIC TOOL\n');
  console.log('=' .repeat(60));
  
  // Step 1: Check what IP the backend sees
  console.log('\n📍 STEP 1: What IP does the backend see you as?');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/ip-whitelist/my-ip`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Your detected IP:', data.ip);
      console.log('   Headers seen by backend:', JSON.stringify(data.headers, null, 2));
    } else {
      console.log('❌ Failed to get your IP:', response.status, response.statusText);
      const text = await response.text();
      console.log('   Response:', text);
    }
  } catch (error) {
    console.error('❌ Error checking your IP:', error.message);
  }
  
  // Step 2: Check current whitelist
  console.log('\n📋 STEP 2: Current IP Whitelist');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/ip-whitelist`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log(`✅ Total whitelisted IPs: ${data.data.length}`);
        console.log('\n   Active IPs:');
        data.data
          .filter(ip => ip.isActive)
          .forEach((ip, index) => {
            console.log(`   ${index + 1}. ${ip.ipAddress}`);
            console.log(`      Name: ${ip.name}`);
            console.log(`      Description: ${ip.description || 'N/A'}`);
            console.log(`      Added: ${new Date(ip.addedAt).toLocaleString()}`);
            console.log(`      Activity Count: ${ip.activityCount}`);
            console.log('');
          });
      } else {
        console.log('⚠️  No whitelist data returned');
      }
    } else {
      console.log('❌ Failed to fetch whitelist:', response.status, response.statusText);
      const text = await response.text();
      console.log('   Response:', text);
    }
  } catch (error) {
    console.error('❌ Error fetching whitelist:', error.message);
  }
  
  // Step 3: Check if your IP is whitelisted
  console.log('\n🔐 STEP 3: IP Whitelist Status Check');
  console.log('-'.repeat(60));
  
  try {
    const myIPResponse = await fetch(`${BACKEND_URL}/api/admin/ip-whitelist/my-ip`);
    if (!myIPResponse.ok) {
      console.log('⚠️  Could not determine your IP for whitelist check');
      return;
    }
    
    const myIPData = await myIPResponse.json();
    const myIP = myIPData.ip;
    
    const checkResponse = await fetch(`${BACKEND_URL}/api/admin/ip-whitelist/check/${myIP}`);
    
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      
      if (checkData.whitelisted) {
        console.log(`✅ YOUR IP (${myIP}) IS WHITELISTED`);
        console.log('   Details:', JSON.stringify(checkData.entry, null, 2));
      } else {
        console.log(`❌ YOUR IP (${myIP}) IS NOT WHITELISTED`);
        console.log('\n   📝 To add your IP to the whitelist, run:');
        console.log(`   
   INSERT INTO public."IPWhitelist" 
   ("ipAddress", "userId", "name", "description", "isActive", "createdAt", "lastUsedAt", "activityCount") 
   VALUES 
   ('${myIP}', NULL, 'Your Name', 'Added via diagnostic tool', true, NOW(), NOW(), 0);
        `);
      }
    } else {
      console.log('⚠️  Could not check whitelist status');
    }
  } catch (error) {
    console.error('❌ Error checking whitelist status:', error.message);
  }
  
  // Step 4: Direct database query SQL
  console.log('\n💾 STEP 4: Direct Database Queries');
  console.log('-'.repeat(60));
  console.log('\nRun these SQL queries in Railway PostgreSQL console:\n');
  console.log('-- Check all whitelisted IPs:');
  console.log('SELECT "ipAddress", "name", "description", "isActive", "activityCount" FROM public."IPWhitelist" ORDER BY "addedAt" DESC;\n');
  console.log('-- Check if specific IP exists (replace with your IP):');
  console.log('SELECT * FROM public."IPWhitelist" WHERE "ipAddress" = \'YOUR_IP_HERE\';\n');
  console.log('-- Add new IP (replace with your details):');
  console.log('INSERT INTO public."IPWhitelist" ("ipAddress", "name", "description", "isActive", "createdAt", "activityCount") VALUES (\'YOUR_IP\', \'Your Name\', \'Your Description\', true, NOW(), 0);\n');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic complete!\n');
}

// Run diagnostic
diagnoseIPWhitelist().catch(console.error);
