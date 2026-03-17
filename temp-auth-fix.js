// TEMPORARY FIX SCRIPT - Use this until Vercel deploys the latest authentication fixes
// Copy this entire script into browser console to fix authentication issues immediately

console.log('🚀 Applying temporary authentication fixes...');

// Override fetch to add proper authentication headers
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    // Get token from localStorage
    const token = localStorage.getItem('omnivox_token');
    
    // Add authentication header if token exists and URL is an API call
    if (token && (url.includes('/api/') || url.includes('froniterai-production.up.railway.app'))) {
        options.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        
        // Ensure credentials are included for same-origin requests
        if (!url.startsWith('http')) {
            options.credentials = 'include';
        }
        
        console.log('🔑 Enhanced fetch request:', url.includes('/api/') ? url : 'Backend API');
    }
    
    return originalFetch.call(this, url, options);
};

console.log('✅ Fetch override applied - API authentication should now work');

// Test the dashboard stats API immediately
async function testDashboardAfterFix() {
    try {
        console.log('🧪 Testing dashboard stats with enhanced authentication...');
        
        const response = await fetch('/api/dashboard/stats');
        console.log('📊 Dashboard response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Dashboard API working with override!', data);
            
            // Force dashboard to reload data
            const dashboardEvent = new CustomEvent('dashboardReload');
            window.dispatchEvent(dashboardEvent);
            
        } else {
            console.log('❌ Dashboard API still failing:', response.status);
        }
    } catch (error) {
        console.error('❌ Dashboard test failed:', error);
    }
}

// Test interaction history API 
async function testInteractionHistoryAfterFix() {
    try {
        console.log('📋 Testing interaction history with enhanced authentication...');
        
        const response = await fetch('https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=509');
        console.log('📊 Interaction history response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Interaction history API working!', data);
            
            if (data.success && data.data?.categories?.outcomed?.length > 0) {
                console.log('🎉 Found outcomed interactions:', data.data.categories.outcomed.length);
                console.log('🔄 Refreshing page to show updated data...');
                setTimeout(() => window.location.reload(), 2000);
            }
        } else {
            console.log('❌ Interaction history API still failing:', response.status);
        }
    } catch (error) {
        console.error('❌ Interaction history test failed:', error);
    }
}

// Run tests
setTimeout(() => {
    testDashboardAfterFix();
    testInteractionHistoryAfterFix();
}, 1000);

console.log(`
🎯 TEMPORARY FIX APPLIED
This script enhances all API calls with proper authentication.

If tests pass:
✅ Dashboard should show live stats
✅ Work tab should show outcomed interactions
✅ All authentication errors should be resolved

This fix will be permanent once Vercel deploys the latest code.
The page will auto-refresh if interactions are found.
`);