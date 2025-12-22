const fetch = require('node-fetch');
const { spawn } = require('child_process');

async function testAuthentication() {
    console.log('🔄 Starting backend server...');
    
    // Start the backend server
    const server = spawn('npm', ['run', 'dev'], {
        cwd: '/Users/zenan/kennex/backend',
        stdio: 'pipe',
        detached: false
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔐 Testing authentication...');
    
    try {
        const response = await fetch('http://localhost:3002/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@kennex.ai',
                password: 'admin123'
            })
        });

        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS! Authentication working!');
            console.log(`Token: ${data.token?.substring(0, 20)}...`);
            console.log(`User: ${data.user?.email} - Role: ${data.user?.role}`);
        } else {
            console.log('❌ FAILED:');
            console.log(await response.text());
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    } finally {
        // Kill the server
        console.log('🔄 Stopping server...');
        server.kill('SIGTERM');
        process.exit(0);
    }
}

testAuthentication();