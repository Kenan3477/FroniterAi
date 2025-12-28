const fetch = require('node-fetch');

async function testCorruptedUsers() {
    console.log('🔍 TESTING SPECIFIC CORRUPTED USERS\n');
    
    // Test the users we suspect are corrupted
    const suspectedCorruptedUsers = [
        {
            email: 'Skye@Gmail.co.uk',
            possiblePasswords: ['test123', 'password', 'Skye123', 'skye123', '123456', 'admin', 'password123']
        },
        {
            email: 'db-check-test@example.com', 
            possiblePasswords: ['DbCheck123!', 'test123', 'password123']
        }
    ];

    for (const user of suspectedCorruptedUsers) {
        console.log(`🧪 Testing: ${user.email}`);
        
        let loginWorked = false;
        
        for (const password of user.possiblePasswords) {
            console.log(`   Trying password: "${password}"`);
            
            try {
                const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: user.email,
                        password: password
                    })
                });

                const loginResult = await loginResponse.json();
                
                if (loginResult.success) {
                    console.log(`   ✅ SUCCESS! Password "${password}" works`);
                    loginWorked = true;
                    break;
                } else {
                    console.log(`   ❌ Failed: ${loginResult.message}`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!loginWorked) {
            console.log(`   ❌❌❌ NO PASSWORD WORKS FOR ${user.email}`);
            console.log(`   🚨 CONFIRMED CORRUPTED USER!`);
        }
        
        console.log('');
    }
    
    console.log('🎯 CORRUPTION ANALYSIS:');
    console.log('If specific users consistently fail login with all reasonable passwords,');
    console.log('they have corrupted password hashes from the previous bug state.');
}

testCorruptedUsers();