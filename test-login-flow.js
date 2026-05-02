// Test the login flow to diagnose the black loading screen issue
const fetch = require('node-fetch');

async function testLoginFlow() {
    console.log('🧪 Testing login flow to diagnose black loading screen...\n');
    
    const frontendUrl = 'https://omnivox-ai-frontend-production.up.railway.app';
    const backendUrl = 'https://froniterai-production.up.railway.app';
    
    try {
        console.log('1. Testing frontend health...');
        const frontendResponse = await fetch(`${frontendUrl}/api/test`);
        console.log('   Frontend status:', frontendResponse.status);
        console.log('   Frontend headers:', Object.fromEntries(frontendResponse.headers));
        
        console.log('\n2. Testing backend health...');
        const backendResponse = await fetch(`${backendUrl}/health`);
        console.log('   Backend status:', backendResponse.status);
        if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            console.log('   Backend data:', JSON.stringify(backendData, null, 2));
        }
        
        console.log('\n3. Testing login API...');
        const loginResponse = await fetch(`${frontendUrl}/api/auth/login`, {
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
        console.log('   Login headers:', Object.fromEntries(loginResponse.headers));
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('   Login data:', JSON.stringify(loginData, null, 2));
            
            // Extract the auth token from set-cookie header
            const setCookieHeader = loginResponse.headers.get('set-cookie');
            console.log('   Set-Cookie header:', setCookieHeader);
            
            if (setCookieHeader && setCookieHeader.includes('auth-token=')) {
                const authTokenMatch = setCookieHeader.match(/auth-token=([^;]+)/);
                const authToken = authTokenMatch ? authTokenMatch[1] : null;
                
                if (authToken) {
                    console.log('\n4. Testing profile API with auth token...');
                    const profileResponse = await fetch(`${frontendUrl}/api/auth/profile`, {
                        headers: {
                            'Cookie': `auth-token=${authToken}`
                        }
                    });
                    
                    console.log('   Profile status:', profileResponse.status);
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        console.log('   Profile data:', JSON.stringify(profileData, null, 2));
                        
                        console.log('\n5. Testing reports filters API...');
                        const filtersResponse = await fetch(`${frontendUrl}/api/reports/voice/campaign/filters`, {
                            headers: {
                                'Cookie': `auth-token=${authToken}`
                            }
                        });
                        
                        console.log('   Filters status:', filtersResponse.status);
                        if (filtersResponse.ok) {
                            const filtersData = await filtersResponse.json();
                            console.log('   Filters data:', JSON.stringify(filtersData, null, 2));
                        } else {
                            const filtersError = await filtersResponse.text();
                            console.log('   Filters error:', filtersError);
                        }
                        
                        console.log('\n6. Testing voice campaign analytics API...');
                        const campaignResponse = await fetch(`${frontendUrl}/api/reports/voice/campaign?dateFrom=2024-12-01&dateTo=2024-12-24`, {
                            headers: {
                                'Cookie': `auth-token=${authToken}`
                            }
                        });
                        
                        console.log('   Campaign status:', campaignResponse.status);
                        if (campaignResponse.ok) {
                            const campaignData = await campaignResponse.json();
                            console.log('   Campaign data sample:', JSON.stringify({
                                success: campaignData.success,
                                totalCalls: campaignData.data?.kpis?.totalCalls,
                                connectedCalls: campaignData.data?.kpis?.connectedCalls,
                                conversionRate: campaignData.data?.kpis?.conversionRate,
                            }, null, 2));
                        } else {
                            const campaignError = await campaignResponse.text();
                            console.log('   Campaign error:', campaignError);
                        }
                        
                    } else {
                        const profileError = await profileResponse.text();
                        console.log('   Profile error:', profileError);
                    }
                }
            }
        } else {
            const loginError = await loginResponse.text();
            console.log('   Login error:', loginError);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoginFlow().then(() => {
    console.log('\n✅ Login flow test completed.');
}).catch(console.error);