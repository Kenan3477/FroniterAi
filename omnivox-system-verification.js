// OMNIVOX SYSTEM VERIFICATION - Run in browser console after login
(function() {
    console.log('🔍 OMNIVOX SYSTEM VERIFICATION STARTING...\n');

    // Test 1: Check authentication state
    const token = localStorage.getItem('omnivox_token');
    console.log('1️⃣ Authentication Status:');
    console.log('   Token exists:', !!token);
    console.log('   Token length:', token ? token.length : 0);
    console.log('   Token preview:', token ? token.substring(0, 50) + '...' : 'None');

    if (!token) {
        console.log('❌ No authentication token found. Please log in first.');
        return;
    }

    // Test 2: Verify dashboard stats API
    console.log('\n2️⃣ Testing Dashboard Stats API...');
    fetch('/api/dashboard/stats', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('   Dashboard Stats Response:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('   ✅ SUCCESS! Dashboard data loaded');
            console.log('   📊 Today Calls:', data.data?.todayCalls || 'N/A');
            console.log('   📱 Total Calls:', data.data?.totalCalls || 'N/A');
            console.log('   👥 Active Contacts:', data.data?.activeContacts || 'N/A');
            console.log('   ⏱️ Avg Duration:', data.data?.avgCallDuration || 'N/A');
        } else {
            console.log('   ❌ Dashboard API failed:', data);
        }
    })
    .catch(error => {
        console.log('   ❌ Dashboard API error:', error);
    });

    // Test 3: Check backend connectivity  
    console.log('\n3️⃣ Testing Backend Connectivity...');
    fetch('https://froniterai-production.up.railway.app/health')
    .then(response => response.json())
    .then(data => {
        console.log('   ✅ Backend Health:', data.status);
        console.log('   🗄️ Database:', data.database?.connected ? 'Connected' : 'Disconnected');
        console.log('   🚀 Version:', data.version || 'Unknown');
    })
    .catch(error => {
        console.log('   ❌ Backend health check failed:', error);
    });

    // Test 4: Authentication endpoints
    console.log('\n4️⃣ Testing Authentication Endpoints...');
    
    // Test refresh endpoint
    fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => {
        console.log('   Refresh endpoint status:', response.status);
        if (response.status === 200) {
            console.log('   ✅ Token refresh available');
        } else if (response.status === 401) {
            console.log('   ⚠️ Refresh token expired (normal if logged in recently)');
        }
    })
    .catch(error => {
        console.log('   ❌ Refresh endpoint error:', error);
    });

    console.log('\n🎯 VERIFICATION COMPLETE');
    console.log('📋 Check results above. All ✅ indicates system is working correctly.');
    console.log('🔄 If dashboard shows zeros, wait 10 seconds then refresh the page.');

})();

console.log('🚀 Omnivox System Verification loaded. Results above...');