const API_BASE_URL = 'https://fron-tier-ai-kennex-production.up.railway.app';

async function testAdminDataListsAccess() {
    console.log('Testing Data Lists access with organization filter bypass...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/data-lists`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Note: Testing without auth to see if endpoint structure is correct
            }
        });
        
        console.log('Data Lists Response Status:', response.status);
        console.log('Data Lists Response Headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.status === 401) {
            console.log('✅ Endpoint exists and properly requires authentication');
        } else {
            const data = await response.text();
            console.log('Data Lists Response Body:', data.substring(0, 500));
        }
        
    } catch (error) {
        console.log('Data Lists Request Error:', error.message);
    }
}

async function testQuickActionsEndpoint() {
    console.log('\nTesting Quick Actions endpoint...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/quick-actions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('Quick Actions Response Status:', response.status);
        
        if (response.status === 401) {
            console.log('✅ Endpoint exists and properly requires authentication');
        } else {
            const data = await response.text();
            console.log('Quick Actions Response Body:', data.substring(0, 500));
        }
        
    } catch (error) {
        console.log('Quick Actions Request Error:', error.message);
    }
}

// Run tests
testAdminDataListsAccess();
testQuickActionsEndpoint();