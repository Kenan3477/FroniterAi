// Check what call records exist and their dispositions
// Run this script to debug why outcomed interactions aren't showing

const checkCallRecords = async () => {
    const token = localStorage.getItem('omnivox_token');
    
    if (!token) {
        console.log('❌ No authentication token found');
        return;
    }
    
    try {
        // First check what calls exist today
        console.log('📊 Checking today\'s call records...');
        
        const statsResponse = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('📊 Dashboard Stats:', stats);
            console.log(`📞 Total calls today: ${stats.data?.today?.todayCalls || 0}`);
        }
        
        // Now check the interaction history categorized API
        console.log('\n📋 Checking interaction history...');
        
        const historyResponse = await fetch('https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=509', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (historyResponse.ok) {
            const history = await historyResponse.json();
            console.log('📋 Interaction History Response:', history);
            
            if (history.success && history.data?.categories) {
                const categories = history.data.categories;
                
                console.log('\n📊 INTERACTION CATEGORIES:');
                console.log(`🔀 Queued: ${categories.queued?.length || 0}`);
                console.log(`📞 Allocated: ${categories.allocated?.length || 0}`);
                console.log(`✅ Outcomed: ${categories.outcomed?.length || 0}`);
                console.log(`❓ Unallocated: ${categories.unallocated?.length || 0}`);
                
                if (categories.outcomed?.length > 0) {
                    console.log('\n🎉 OUTCOMED INTERACTIONS FOUND:');
                    categories.outcomed.forEach((interaction, i) => {
                        console.log(`${i+1}. Contact: ${interaction.customerName || interaction.telephone}`);
                        console.log(`   Outcome: ${interaction.outcome}`);
                        console.log(`   Date: ${interaction.dateTime}`);
                        console.log(`   Call ID: ${interaction.callId}`);
                        console.log('   ---');
                    });
                } else {
                    console.log('\n❌ NO OUTCOMED INTERACTIONS FOUND');
                    console.log('💡 Possible reasons:');
                    console.log('  1. Calls made but not dispositioned properly');
                    console.log('  2. Disposition outcome not matching expected values');
                    console.log('  3. AgentId mismatch (expected: 509)');
                    console.log('  4. Database query filtering issue');
                    
                    // Check if any interactions exist at all
                    const totalInteractions = (categories.queued?.length || 0) + 
                                            (categories.allocated?.length || 0) + 
                                            (categories.unallocated?.length || 0);
                    
                    if (totalInteractions > 0) {
                        console.log(`\n📋 Found ${totalInteractions} total interactions in other categories`);
                        console.log('🔍 Check if calls are in different categories');
                    } else {
                        console.log('\n⚠️ NO INTERACTIONS FOUND IN ANY CATEGORY');
                        console.log('🔍 This suggests calls exist but aren\'t being tracked as interactions');
                    }
                }
            } else {
                console.log('❌ Invalid interaction history response structure');
            }
        } else {
            console.log('❌ Failed to fetch interaction history:', historyResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Error checking call records:', error);
    }
};

// Run the check
checkCallRecords();