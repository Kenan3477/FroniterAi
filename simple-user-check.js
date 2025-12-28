const fetch = require('node-fetch');

async function simpleUserCheck() {
    try {
        // Try to login as admin first
        console.log('🔑 Trying to login as admin...');
        const adminLogin = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });
        
        const adminResult = await adminLogin.json();
        if (adminResult.success) {
            console.log('✅ Admin login works - checking users...');
            
            // Get users list
            const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${adminResult.data.token}` }
            });
            
            const usersResult = await usersResponse.json();
            const users = usersResult.data || usersResult.users || [];
            
            console.log(`\n📊 Total users: ${users.length}`);
            users.forEach(user => {
                console.log(`  - ${user.email} (${user.name}) - Created: ${user.createdAt}`);
            });
            
        } else {
            console.log('❌ Admin login failed - database might be empty');
            console.log('This means ALL users were deleted, including the admin from the seed file.');
            console.log('You may need to run the seed script to restore the admin user.');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

simpleUserCheck();