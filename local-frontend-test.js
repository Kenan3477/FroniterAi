// Test Local Frontend Configuration
// Run this in browser console at http://localhost:3001

console.log('🔍 Testing Local Frontend → Railway Backend Connection...');

// Test 1: Check environment variables
console.log('📡 Backend URL:', window.location.origin);
console.log('📡 Expected Railway Backend: https://froniterai-production.up.railway.app');

// Test 2: Check if authentication token exists
const token = localStorage.getItem('omnivox_token');
console.log('🔑 Token exists:', !!token);
if (token) {
    console.log('🔑 Token preview:', token.substring(0, 50) + '...');
}

// Test 3: Test dashboard API with authentication
async function testDashboardAPI() {
    try {
        console.log('📊 Testing Dashboard API...');
        
        const response = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Dashboard API Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Dashboard API Success:', data);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.log('❌ Dashboard API Failed:', errorText);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error('❌ Dashboard API Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 4: Test interaction history directly to Railway backend
async function testInteractionHistory() {
    try {
        console.log('📋 Testing Interaction History API (Railway Backend)...');
        
        const response = await fetch('https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=509', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📋 Interaction History Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Interaction History Success:', data);
            
            if (data.success && data.data?.categories?.outcomed?.length > 0) {
                console.log(`🎉 FOUND ${data.data.categories.outcomed.length} OUTCOMED INTERACTIONS!`);
                console.log('📝 Your dispositioned calls:', data.data.categories.outcomed);
            } else {
                console.log('📝 No outcomed interactions found yet');
            }
            
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.log('❌ Interaction History Failed:', errorText);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error('❌ Interaction History Error:', error);
        return { success: false, error: error.message };
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Local Frontend Tests...\n');
    
    if (!token) {
        console.log('⚠️ No authentication token found. Please log in first.');
        return;
    }
    
    const dashboardResult = await testDashboardAPI();
    const historyResult = await testInteractionHistory();
    
    console.log('\n📊 TEST SUMMARY:');
    console.log('Dashboard API:', dashboardResult.success ? '✅ WORKING' : '❌ FAILED');
    console.log('Interaction History:', historyResult.success ? '✅ WORKING' : '❌ FAILED');
    
    if (dashboardResult.success && historyResult.success) {
        console.log('\n🎉 LOCAL FRONTEND FULLY OPERATIONAL!');
        console.log('💡 Go to Work → Outcomed Interactions to see your call dispositions');
    }
}

// Auto-run tests after 2 seconds
setTimeout(runAllTests, 2000);

console.log('✅ Local frontend test script loaded. Tests will run automatically...');