// Test script for outcomed interactions display
// Copy this into browser console after making a call and dispositioning it

(async function() {
    console.log('🔍 Testing Outcomed Interactions Fix...\n');

    const token = localStorage.getItem('omnivox_token');
    if (!token) {
        console.log('❌ No authentication token found');
        return;
    }

    console.log('🔑 Token exists, testing APIs...\n');

    // Test 1: Dashboard Stats API
    console.log('1️⃣ Testing Dashboard Stats API...');
    try {
        const dashboardResponse = await fetch('/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });
        
        console.log('   Status:', dashboardResponse.status);
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            console.log('   ✅ Dashboard API working:', dashboardData.success);
        } else {
            console.log('   ❌ Dashboard API failed');
        }
    } catch (error) {
        console.log('   ❌ Dashboard API error:', error);
    }

    // Test 2: Interaction History API (the one that was failing)
    console.log('\n2️⃣ Testing Interaction History API...');
    try {
        const interactionResponse = await fetch('https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=509', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('   Status:', interactionResponse.status);
        if (interactionResponse.ok) {
            const interactionData = await interactionResponse.json();
            console.log('   ✅ Interaction API working:', interactionData.success);
            
            if (interactionData.success && interactionData.data?.categories) {
                const outcomed = interactionData.data.categories.outcomed || [];
                console.log('   📋 Outcomed interactions found:', outcomed.length);
                
                if (outcomed.length > 0) {
                    console.log('   🎉 SUCCESS! Your dispositioned call should now appear in Work tab');
                    console.log('   Latest interaction:', outcomed[0]);
                } else {
                    console.log('   ⚠️ No outcomed interactions yet - make sure call was saved properly');
                }
            }
        } else {
            const errorText = await interactionResponse.text();
            console.log('   ❌ Interaction API failed:', errorText);
        }
    } catch (error) {
        console.log('   ❌ Interaction API error:', error);
    }

    // Test 3: Notifications API
    console.log('\n3️⃣ Testing Notifications API...');
    try {
        const notificationResponse = await fetch('/api/notifications/summary', {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });
        
        console.log('   Status:', notificationResponse.status);
        if (notificationResponse.ok) {
            console.log('   ✅ Notifications API working');
        } else {
            console.log('   ❌ Notifications API failed');
        }
    } catch (error) {
        console.log('   ❌ Notifications API error:', error);
    }

    console.log('\n🎯 SUMMARY:');
    console.log('   - If all APIs show ✅, your outcomed interactions should appear');
    console.log('   - Go to Work tab and check Outcomed Interactions');
    console.log('   - Dashboard should also show live statistics');
    console.log('   - Page will auto-refresh in 5 seconds...');
    
    setTimeout(() => {
        console.log('🔄 Refreshing page to see updated UI...');
        window.location.reload();
    }, 5000);

})();

console.log('📋 Outcomed interactions test script loaded...');