// Simple test to check authentication state and trigger dashboard reload
// Copy this entire script into browser console and it will auto-run

(function() {
    console.log('🔍 Dashboard Authentication Diagnostic...');
    
    // 1. Check if user is logged in
    const token = localStorage.getItem('omnivox_token');
    console.log('🎯 JWT Token exists:', !!token);
    
    if (token) {
        console.log('🔑 Token preview:', token.substring(0, 50) + '...');
    }
    
    // 2. Test manual API call with proper auth
    async function testAuth() {
        if (!token) {
            console.log('❌ No token found, authentication required');
            return;
        }
        
        console.log('📡 Testing /api/dashboard/stats with Bearer token...');
        
        try {
            const response = await fetch('/api/dashboard/stats', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
            
            console.log('📊 API Response Status:', response.status);
            
            if (response.status === 200) {
                const data = await response.json();
                console.log('✅ SUCCESS! Dashboard data:', data);
                
                // Force reload the dashboard component
                window.location.reload();
                
            } else if (response.status === 401) {
                console.log('❌ 401 Unauthorized - Token might be expired or invalid');
                const errorText = await response.text();
                console.log('Error details:', errorText);
                
                // Try to refresh the page to get a new token
                console.log('🔄 Refreshing page to get new authentication...');
                window.location.reload();
                
            } else {
                console.log('❓ Unexpected status:', response.status);
                const errorText = await response.text();
                console.log('Response:', errorText);
            }
            
        } catch (error) {
            console.error('❌ Network error:', error);
        }
    }
    
    // 3. Auto-run the test
    testAuth();
    
})();

console.log('📋 Dashboard auth diagnostic script loaded. Check results above.');