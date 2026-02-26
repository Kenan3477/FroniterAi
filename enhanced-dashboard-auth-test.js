// Enhanced Dashboard Authentication Test with Token Refresh
// Copy this entire script into browser console

(async function() {
    console.log('🔄 Enhanced Dashboard Authentication Test...');
    
    const token = localStorage.getItem('omnivox_token');
    console.log('🎯 Current JWT Token exists:', !!token);
    
    if (!token) {
        console.log('❌ No token found, please log in first');
        return;
    }
    
    // Function to test token refresh
    async function testTokenRefresh() {
        console.log('🔄 Testing token refresh endpoint...');
        
        try {
            const refreshResponse = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include', // This includes the refresh token cookie
            });
            
            console.log('📊 Refresh response status:', refreshResponse.status);
            
            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                console.log('✅ Token refresh successful:', refreshData);
                
                if (refreshData.success && refreshData.data?.accessToken) {
                    // Update localStorage with new token
                    localStorage.setItem('omnivox_token', refreshData.data.accessToken);
                    console.log('💾 New token saved to localStorage');
                    return refreshData.data.accessToken;
                }
            } else {
                const errorText = await refreshResponse.text();
                console.log('❌ Token refresh failed:', errorText);
                return null;
            }
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            return null;
        }
    }
    
    // Function to test dashboard stats with token
    async function testDashboardWithToken(token) {
        console.log('📡 Testing dashboard stats with token...');
        
        try {
            const response = await fetch('/api/dashboard/stats', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
            
            console.log('📊 Dashboard response status:', response.status);
            
            if (response.status === 200) {
                const data = await response.json();
                console.log('✅ SUCCESS! Dashboard data:', data);
                return true;
            } else {
                const errorText = await response.text();
                console.log('❌ Dashboard failed:', response.status, errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ Dashboard error:', error);
            return false;
        }
    }
    
    // Main test sequence
    console.log('\n1️⃣ Testing current token...');
    const currentTokenWorks = await testDashboardWithToken(token);
    
    if (!currentTokenWorks) {
        console.log('\n2️⃣ Current token failed, attempting refresh...');
        const newToken = await testTokenRefresh();
        
        if (newToken) {
            console.log('\n3️⃣ Testing with refreshed token...');
            const refreshedTokenWorks = await testDashboardWithToken(newToken);
            
            if (refreshedTokenWorks) {
                console.log('\n🎉 SUCCESS! Dashboard working with refreshed token');
                console.log('🔄 Reloading page to see dashboard with new token...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                console.log('\n❌ Dashboard still failing even with refreshed token');
            }
        } else {
            console.log('\n❌ Token refresh failed - may need to log out and back in');
        }
    } else {
        console.log('\n✅ Current token works fine - dashboard should be loading!');
        console.log('🔄 Reloading page to see dashboard...');
        setTimeout(() => window.location.reload(), 1000);
    }
    
})();

console.log('📋 Enhanced authentication test script loaded and running...');