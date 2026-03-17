// INTERACTION HISTORY DIAGNOSTIC - Run in browser console on Work page

console.log('🔍 DIAGNOSING OUTCOMED INTERACTIONS ISSUE...');

async function diagnoseCourteracctions() {
    const token = localStorage.getItem('omnivox_token');
    console.log('🔑 Token exists:', !!token);
    
    if (!token) {
        console.log('❌ No authentication token found!');
        return;
    }
    
    console.log('🔑 Token preview:', token.substring(0, 50) + '...');
    
    // Test 1: Check direct Railway backend interaction history
    try {
        console.log('🧪 TEST 1: Direct Railway Backend Call');
        console.log('📡 Calling: https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=509');
        
        const directResponse = await fetch('https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=509', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Direct Railway response status:', directResponse.status);
        
        if (directResponse.ok) {
            const directData = await directResponse.json();
            console.log('✅ Direct Railway response:', directData);
            
            if (directData.success && directData.data?.categories) {
                const categories = directData.data.categories;
                console.log('📋 Categories found:');
                console.log('  - Queued:', categories.queued?.length || 0);
                console.log('  - Allocated:', categories.allocated?.length || 0);
                console.log('  - Outcomed:', categories.outcomed?.length || 0);
                console.log('  - Unallocated:', categories.unallocated?.length || 0);
                
                if (categories.outcomed?.length > 0) {
                    console.log('🎉 FOUND OUTCOMED INTERACTIONS!');
                    console.log('📝 Outcomed interactions:', categories.outcomed);
                } else {
                    console.log('⚠️ No outcomed interactions found in backend response');
                }
            }
        } else {
            const errorText = await directResponse.text();
            console.log('❌ Direct Railway call failed:', errorText);
        }
    } catch (error) {
        console.error('❌ Direct Railway error:', error);
    }
    
    // Test 2: Check frontend API proxy
    try {
        console.log('\n🧪 TEST 2: Frontend API Proxy Call');
        console.log('📡 Calling: /api/interaction-history/categorized');
        
        const proxyResponse = await fetch('/api/interaction-history/categorized?agentId=509', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Frontend proxy response status:', proxyResponse.status);
        
        if (proxyResponse.ok) {
            const proxyData = await proxyResponse.json();
            console.log('✅ Frontend proxy response:', proxyData);
        } else {
            const errorText = await proxyResponse.text();
            console.log('❌ Frontend proxy call failed:', errorText);
        }
    } catch (error) {
        console.error('❌ Frontend proxy error:', error);
    }
    
    // Test 3: Check what calls exist in database
    try {
        console.log('\n🧪 TEST 3: Check Today\'s Call Records');
        
        const callsResponse = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (callsResponse.ok) {
            const callsData = await callsResponse.json();
            console.log('📊 Dashboard stats show:', callsData.data?.today?.todayCalls || 0, 'calls today');
            console.log('📊 Full stats:', callsData);
        }
    } catch (error) {
        console.error('❌ Dashboard stats error:', error);
    }
    
    console.log('\n📋 DIAGNOSIS COMPLETE');
    console.log('Expected: If calls exist but no outcomed interactions, the issue is:');
    console.log('1. Calls were made but not properly dispositioned');
    console.log('2. Dispositions were saved but not linked correctly'); 
    console.log('3. Interaction history API has a filtering issue');
}

// Auto-run diagnosis
diagnoseCourteracctions();

console.log('🚀 Interaction history diagnosis started...');