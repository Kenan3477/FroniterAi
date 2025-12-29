const fetch = require('node-fetch');
const fs = require('fs');

// Test login and then compare campaign endpoints
async function testCampaignEndpoints() {
    try {
        // First, login to get credentials
        console.log('🔐 Logging in...');
        
        let cookies;
        try {
            const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'admin@kennex.ai',
                    password: 'admin123'
                })
            });

            if (!loginResponse.ok) {
                console.log('Login with admin123 failed, trying password "password"...');
                const loginResponse2 = await fetch('http://localhost:3001/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: 'admin@kennex.ai',
                        password: 'password'
                    })
                });
                
                if (!loginResponse2.ok) {
                    throw new Error(`Both login attempts failed. Status: ${loginResponse2.status}`);
                }
                
                cookies = loginResponse2.headers.get('set-cookie');
            } else {
                cookies = loginResponse.headers.get('set-cookie');
            }
        } catch (loginErr) {
            console.log('❌ Login failed:', loginErr.message);
            console.log('⚠️  Proceeding without authentication (will likely get 401 errors)');
            cookies = '';
        }

        console.log('✅ Login successful!' + (cookies ? ` Cookies: ${cookies.substring(0, 50)}...` : ''));

        // Test campaign management endpoint
        console.log('\n📊 Testing Campaign Management endpoint...');
        const campaignManagementResponse = await fetch('http://localhost:3001/api/admin/campaign-management/campaigns', {
            headers: {
                'Cookie': cookies || ''
            }
        });

        if (campaignManagementResponse.ok) {
            const cmData = await campaignManagementResponse.json();
            console.log('✅ Campaign Management API Response:');
            console.log('   - Success:', cmData.success);
            console.log('   - Total campaigns:', cmData.data?.length || 0);
            console.log('   - Campaign details:');
            (cmData.data || []).forEach((c, i) => {
                console.log(`     ${i+1}. ${c.name} (ID: ${c.id}, Status: ${c.status}, Active: ${c.isActive})`);
            });
            
            console.log('\n🔍 Full campaign names list:');
            console.log((cmData.data || []).map(c => `"${c.name}"`).join(', '));
            
            // Save to file for analysis
            fs.writeFileSync('/Users/zenan/kennex/debug-campaign-data.json', JSON.stringify(cmData, null, 2));
            console.log('\n💾 Full response saved to debug-campaign-data.json');
            
        } else {
            console.log('❌ Campaign Management endpoint failed:', campaignManagementResponse.status);
            const error = await campaignManagementResponse.text();
            console.log('   Error:', error);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testCampaignEndpoints();