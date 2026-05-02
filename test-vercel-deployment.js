// Test the Vercel deployment
const fetch = require('node-fetch');

async function testVercelDeployment() {
    console.log('🧪 Testing Vercel deployment...\n');
    
    const vercelUrl = 'https://omnivox.vercel.app';
    
    try {
        console.log('1. Testing Vercel frontend health...');
        const frontendResponse = await fetch(`${vercelUrl}/api/test`);
        console.log('   Frontend status:', frontendResponse.status);
        
        if (frontendResponse.ok) {
            const frontendData = await frontendResponse.text();
            console.log('   Frontend response:', frontendData);
        }
        
        console.log('\n2. Testing auth profile API...');
        // First login to get token
        const loginResponse = await fetch(`${vercelUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        console.log('   Login status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const setCookieHeader = loginResponse.headers.get('set-cookie');
            if (setCookieHeader && setCookieHeader.includes('auth-token=')) {
                const authTokenMatch = setCookieHeader.match(/auth-token=([^;]+)/);
                const authToken = authTokenMatch ? authTokenMatch[1] : null;
                
                if (authToken) {
                    console.log('\n3. Testing profile API...');
                    const profileResponse = await fetch(`${vercelUrl}/api/auth/profile`, {
                        headers: {
                            'Cookie': `auth-token=${authToken}`
                        }
                    });
                    
                    console.log('   Profile status:', profileResponse.status);
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        console.log('   Profile role:', profileData.user?.role);
                        
                        console.log('\n4. Testing reports filters API...');
                        const filtersResponse = await fetch(`${vercelUrl}/api/reports/voice/campaign/filters`, {
                            headers: {
                                'Cookie': `auth-token=${authToken}`
                            }
                        });
                        
                        console.log('   Filters status:', filtersResponse.status);
                        if (filtersResponse.ok) {
                            const filtersData = await filtersResponse.json();
                            console.log('   Filters success:', filtersData.success);
                            console.log('   Campaigns count:', filtersData.data?.campaigns?.length);
                            console.log('   Agents count:', filtersData.data?.agents?.length);
                        } else {
                            const filtersError = await filtersResponse.text();
                            console.log('   Filters error:', filtersError.substring(0, 200));
                        }
                        
                        console.log('\n5. Testing voice campaign analytics API...');
                        const campaignResponse = await fetch(`${vercelUrl}/api/reports/voice/campaign?dateFrom=2024-12-01&dateTo=2024-12-24`, {
                            headers: {
                                'Cookie': `auth-token=${authToken}`
                            }
                        });
                        
                        console.log('   Campaign status:', campaignResponse.status);
                        if (campaignResponse.ok) {
                            const campaignData = await campaignResponse.json();
                            console.log('   Campaign success:', campaignData.success);
                            console.log('   Total calls:', campaignData.data?.kpis?.totalCalls);
                        } else {
                            const campaignError = await campaignResponse.text();
                            console.log('   Campaign error:', campaignError.substring(0, 200));
                        }
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testVercelDeployment().then(() => {
    console.log('\n✅ Vercel deployment test completed.');
}).catch(console.error);