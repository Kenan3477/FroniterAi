const fetch = require('node-fetch');

// This script simulates exactly what happens when the frontend creates a user
// It will help us identify where password corruption occurs

async function debugFrontendFlow() {
    console.log('🔍 DEBUGGING FRONTEND USER CREATION FLOW\n');
    
    // Test user data - exactly what frontend would send
    const testUser = {
        name: 'Debug Test User',
        email: 'debug-test@example.com',
        password: 'Kenan3477!', // Same password that's failing
        role: 'AGENT',
        status: 'ACTIVE',
        department: '',
        phoneNumber: ''
    };

    try {
        console.log('📋 Test User Data:');
        console.log(JSON.stringify(testUser, null, 2));
        console.log('');

        // Step 1: Test direct backend API call (we know this works)
        console.log('🧪 STEP 1: Direct backend API call (known working)');
        const directResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AbWFuYWdlbWVudC5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3MzkwMzI5NjIsImV4cCI6MTczOTEwNDk2Mn0.Ds1y6iYfY6qYnOKt8e9Ef5F1DgzYpI8XQ3pOYdAgKvI'
            },
            body: JSON.stringify({
                ...testUser,
                email: 'debug-direct@example.com'
            })
        });

        const directResult = await directResponse.json();
        console.log('Direct backend result:', directResult);
        
        if (directResult.success) {
            console.log('✅ Direct backend call WORKED');
        } else {
            console.log('❌ Direct backend call FAILED');
        }
        console.log('');

        // Step 2: Test frontend proxy API call (this is what fails)
        console.log('🧪 STEP 2: Frontend proxy API call (suspected corruption)');
        const proxyResponse = await fetch('http://localhost:3000/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AbWFuYWdlbWVudC5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3MzkwMzI5NjIsImV4cCI6MTczOTEwNDk2Mn0.Ds1y6iYfY6qYnOKt8e9Ef5F1DgzYpI8XQ3pOYdAgKvI'
            },
            body: JSON.stringify({
                ...testUser,
                email: 'debug-proxy@example.com'
            })
        });

        const proxyResult = await proxyResponse.json();
        console.log('Frontend proxy result:', proxyResult);
        
        if (proxyResult.success) {
            console.log('✅ Frontend proxy call WORKED');
        } else {
            console.log('❌ Frontend proxy call FAILED');
        }
        console.log('');

        // Step 3: Try to login with both users to compare
        if (directResult.success) {
            console.log('🧪 STEP 3a: Testing login with direct-created user');
            const directLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'debug-direct@example.com',
                    password: 'Kenan3477!'
                })
            });
            
            const directLoginResult = await directLoginResponse.json();
            console.log('Direct-created user login:', directLoginResult.success ? '✅ SUCCESS' : '❌ FAILED');
            if (!directLoginResult.success) {
                console.log('Direct login error:', directLoginResult.message);
            }
            console.log('');
        }

        if (proxyResult.success) {
            console.log('🧪 STEP 3b: Testing login with proxy-created user');
            const proxyLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'debug-proxy@example.com',
                    password: 'Kenan3477!'
                })
            });
            
            const proxyLoginResult = await proxyLoginResponse.json();
            console.log('Proxy-created user login:', proxyLoginResult.success ? '✅ SUCCESS' : '❌ FAILED');
            if (!proxyLoginResult.success) {
                console.log('Proxy login error:', proxyLoginResult.message);
            }
            console.log('');
        }

        // Summary
        console.log('📊 SUMMARY:');
        console.log(`Direct backend creation: ${directResult.success ? '✅' : '❌'}`);
        console.log(`Frontend proxy creation: ${proxyResult.success ? '✅' : '❌'}`);
        
        if (directResult.success && proxyResult.success) {
            console.log('\n🔍 Both creation methods worked. The issue may be in password storage or later processing.');
            console.log('💡 Next step: Compare the actual password hashes stored in the database');
        } else if (directResult.success && !proxyResult.success) {
            console.log('\n🎯 FOUND THE ISSUE: Frontend proxy is corrupting the request!');
            console.log('💡 Check the frontend API route handling');
        } else {
            console.log('\n⚠️ Both methods failed - there may be a backend issue');
        }

    } catch (error) {
        console.error('❌ Error during debug flow:', error);
    }
}

debugFrontendFlow();