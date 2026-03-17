// Frontend test script to verify authentication fix
// This can be run in the browser console on the dashboard page

console.log('🔍 Testing Dashboard Authentication Fix...');

// Function to test the fixed authentication
async function testDashboardAuth() {
    try {
        // Get the JWT token from localStorage (same as the fix)
        const token = localStorage.getItem('omnivox_token');
        console.log('📋 JWT token found:', !!token);
        
        if (!token) {
            console.log('❌ No JWT token found in localStorage');
            return;
        }

        // Test the stats endpoint with proper Bearer token (same as our fix)
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        console.log('📡 Making authenticated request to /api/dashboard/stats...');
        
        const response = await fetch('/api/dashboard/stats', {
            credentials: 'include',
            headers
        });

        console.log('📊 Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Authentication successful! Data received:', data);
            
            if (data.success && data.data) {
                console.log('📈 Dashboard stats:');
                console.log('   - Today calls:', data.data.todayCalls);
                console.log('   - Total calls:', data.data.totalCalls);
                console.log('   - Active contacts:', data.data.activeContacts);
                console.log('   - Average call duration:', data.data.avgCallDuration);
            }
        } else {
            console.log('❌ Request failed:', response.status, response.statusText);
            const errorText = await response.text();
            console.log('Error details:', errorText);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Instructions for the user
console.log(`
📋 INSTRUCTIONS:
1. Open your browser and go to the dashboard page
2. Open browser console (F12 > Console)
3. Paste this entire script in the console
4. Run: testDashboardAuth()
5. Check the results

If authentication is fixed, you should see:
✅ Authentication successful! Data received: [object with stats]
📈 Dashboard stats with actual numbers

If still broken, you'll see:
❌ Request failed: 401 Unauthorized
`);

// Auto-run if this is being executed in browser console
if (typeof window !== 'undefined' && window.localStorage) {
    console.log('🚀 Auto-running authentication test...');
    testDashboardAuth();
}