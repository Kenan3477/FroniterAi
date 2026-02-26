// Simple Dashboard Test - Copy this entire script into browser console
(function() {
    console.log('🚀 Testing Dashboard with JWT bypass fix...');
    
    const token = localStorage.getItem('omnivox_token');
    console.log('🔑 Token exists:', !!token);
    
    if (token) {
        console.log('🔍 Token preview:', token.substring(0, 50) + '...');
        
        // Test the dashboard stats endpoint directly
        fetch('/api/dashboard/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        })
        .then(response => {
            console.log('📊 Dashboard response status:', response.status);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('🎉 SUCCESS! Dashboard data:', data);
                console.log('📈 Today calls:', data.data?.todayCalls || 'N/A');
                console.log('📱 Total calls:', data.data?.totalCalls || 'N/A');
                console.log('🔄 Reloading page in 2 seconds...');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                console.log('❌ Dashboard failed:', data);
            }
        })
        .catch(error => {
            console.error('❌ Error:', error);
        });
    } else {
        console.log('❌ No token found');
    }
})();