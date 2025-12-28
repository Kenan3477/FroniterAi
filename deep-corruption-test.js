const fetch = require('node-fetch');

async function deepPasswordCorruptionTest() {
    console.log('🔍 DEEP PASSWORD CORRUPTION ANALYSIS\n');
    
    try {
        // Get auth token
        console.log('🔑 Getting admin auth...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        const cookies = loginResponse.headers.get('set-cookie');
        const authCookie = cookies.match(/auth-token=([^;]+)/)?.[0];
        
        if (!authCookie) {
            console.error('❌ Failed to get auth cookie');
            return;
        }
        console.log('✅ Got auth token\n');

        // Create test user that mimics the original problematic pattern
        const testCases = [
            {
                name: 'Kenan UK Domain Test',
                email: 'kenan.corruption.test@test.co.uk',
                password: '3477'
            },
            {
                name: 'Kennen iCloud Test', 
                email: 'kennen.corruption.test@icloud.com',
                password: 'Kenan3477!'
            },
            {
                name: 'Simple UK Test',
                email: 'simple.test@gmail.co.uk',
                password: 'Simple123!'
            }
        ];

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            console.log(`🧪 TEST ${i + 1}: ${testCase.name}`);
            console.log(`    Email: ${testCase.email}`);
            console.log(`    Password: "${testCase.password}"`);
            
            const testUser = {
                name: testCase.name,
                email: testCase.email,
                password: testCase.password,
                role: 'AGENT',
                status: 'ACTIVE',
                department: '',
                phoneNumber: ''
            };

            // Step 1: Create user through frontend
            console.log('    📝 Creating user through frontend...');
            const createResponse = await fetch('http://localhost:3000/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': authCookie
                },
                body: JSON.stringify(testUser)
            });

            const createResult = await createResponse.json();
            
            if (!createResult.success) {
                console.log(`    ❌ Creation failed: ${createResult.message}`);
                continue;
            }

            console.log(`    ✅ User created with ID: ${createResult.data.id}`);

            // Step 2: Test direct Railway backend login (the real test)
            console.log('    🔐 Testing direct Railway backend login...');
            const directLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: testCase.email,
                    password: testCase.password
                })
            });

            const directLoginResult = await directLoginResponse.json();
            
            if (directLoginResult.success) {
                console.log(`    ✅ Railway login WORKS - no corruption!`);
            } else {
                console.log(`    ❌❌❌ Railway login FAILS - PASSWORD CORRUPTED!`);
                console.log(`    Backend error: ${directLoginResult.message}`);
                
                // Let's get the raw password hash from database to investigate
                console.log(`    🔍 Investigating password hash in database...`);
            }

            // Step 3: Test frontend login routing (might also be broken)
            console.log('    🌐 Testing frontend login routing...');
            const frontendLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: testCase.email,
                    password: testCase.password
                })
            });

            const frontendLoginResult = await frontendLoginResponse.json();
            
            if (frontendLoginResult.success) {
                console.log(`    ✅ Frontend login works`);
            } else {
                console.log(`    ❌ Frontend login also fails: ${frontendLoginResult.error}`);
            }

            console.log('');
            
            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Step 4: Check what's in the Railway database
        console.log('🔍 CHECKING RAILWAY DATABASE CONTENTS...');
        const backendUsersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authCookie.split('=')[1]}`
            }
        });

        if (backendUsersResponse.ok) {
            const backendUsers = await backendUsersResponse.json();
            const users = backendUsers.data || backendUsers.users || backendUsers;
            
            console.log('Recent users in Railway database:');
            if (Array.isArray(users)) {
                users.slice(0, 10).forEach(user => {
                    console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
                });
            } else {
                console.log('Unexpected users format:', typeof users);
            }
        } else {
            console.log('❌ Could not fetch Railway users');
        }

    } catch (error) {
        console.error('❌ Error during deep corruption test:', error);
    }
}

deepPasswordCorruptionTest();