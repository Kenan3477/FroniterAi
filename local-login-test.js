// Test Login Fix - Run in browser console at http://localhost:3000

console.log('🔧 Testing Local Frontend → Railway Backend Login...');

// Test the corrected backend URL
async function testLogin() {
    try {
        console.log('🔐 Testing login API endpoint...');
        
        const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'ken@simpleemails.co.uk',
                password: 'Demo123!' // Replace with your actual password
            })
        });
        
        console.log('🔐 Login API Status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login Success:', loginData);
            
            // Check if token was set
            const token = localStorage.getItem('omnivox_token');
            console.log('🔑 Token stored:', !!token);
            
            if (token) {
                console.log('🎉 LOGIN WORKING! You can now use the dashboard.');
                
                // Auto-redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            }
        } else {
            const errorData = await loginResponse.text();
            console.log('❌ Login failed:', errorData);
            
            // Try to understand the error
            if (loginResponse.status === 500) {
                console.log('💡 This might be a backend connection issue.');
            } else if (loginResponse.status === 401) {
                console.log('💡 Check your email/password combination.');
            }
        }
    } catch (error) {
        console.error('❌ Login test error:', error);
    }
}

// Run test
testLogin();

console.log('⚡ Login test started. Check console for results...');