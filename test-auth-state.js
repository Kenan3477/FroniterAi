// Check authentication status for dashboard
console.log('🔍 Checking authentication state...');

// Check if token exists
const token = localStorage.getItem('omnivox_token');
console.log('Token exists:', !!token);
console.log('Token length:', token?.length || 0);

// Check if token is expired by trying to decode it (basic check)
if (token) {
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('Token payload:', payload);
            
            const now = Date.now() / 1000;
            const isExpired = payload.exp && payload.exp < now;
            console.log('Token expired:', isExpired);
            
            if (payload.exp) {
                const expiryDate = new Date(payload.exp * 1000);
                console.log('Token expires at:', expiryDate.toISOString());
                console.log('Current time:', new Date().toISOString());
            }
        }
    } catch (e) {
        console.log('Token decode error:', e.message);
    }
}

// Check current user state
const userStr = localStorage.getItem('user');
if (userStr) {
    try {
        const user = JSON.parse(userStr);
        console.log('Stored user:', user);
    } catch (e) {
        console.log('User parse error:', e.message);
    }
}

// Test the stats API directly with current auth
fetch('/api/dashboard/stats', {
    credentials: 'include',
    headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('Direct API test status:', response.status);
    if (response.status === 401) {
        console.log('❌ Authentication failed - token is invalid or expired');
    }
    return response.json();
})
.then(data => {
    console.log('Direct API test response:', data);
})
.catch(error => {
    console.log('Direct API test error:', error);
});