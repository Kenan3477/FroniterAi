const axios = require('axios');

async function debugCallRecords() {
    try {
        console.log('🔍 Debugging call records for dashboard stats...\n');

        const API_BASE = 'https://froniterai-production.up.railway.app';
        
        // Check if there are any call records
        console.log('📊 Checking call records...');
        const response = await axios.get(`${API_BASE}/api/calls`);
        
        if (response.status === 200) {
            console.log('✅ Call records API responded successfully');
            console.log('Response keys:', Object.keys(response.data));
            console.log('Data structure:', typeof response.data);
            
            if (response.data.success && response.data.data) {
                const calls = response.data.data;
                console.log(`📞 Found ${calls.length} call records`);
                
                if (calls.length > 0) {
                    console.log('\n📋 Recent call records:');
                    calls.slice(0, 5).forEach((call, index) => {
                        console.log(`${index + 1}. Call ID: ${call.id || call.callId}`);
                        console.log(`   Phone: ${call.phone || call.phoneNumber}`);
                        console.log(`   Status: ${call.status || call.outcome}`);
                        console.log(`   Agent: ${call.agentId}`);
                        console.log(`   Created: ${call.createdAt}`);
                        console.log(`   Duration: ${call.duration || 'N/A'}`);
                        console.log('');
                    });
                } else {
                    console.log('❌ No call records found');
                }
            } else {
                console.log('❌ No call data in response');
                console.log('Full response:', JSON.stringify(response.data, null, 2));
            }
        } else {
            console.log(`❌ Call records API error: ${response.status}`);
        }

        // Check interactions table for call history
        console.log('\n🔄 Checking interaction records...');
        const interactionResponse = await axios.get(`${API_BASE}/api/interactions`, {
            params: { limit: 10 }
        });
        
        if (interactionResponse.status === 200 && interactionResponse.data.success) {
            const interactions = interactionResponse.data.data;
            console.log(`💬 Found ${interactions.length} interaction records`);
            
            if (interactions.length > 0) {
                console.log('\n📋 Recent interactions:');
                interactions.slice(0, 5).forEach((interaction, index) => {
                    console.log(`${index + 1}. Interaction ID: ${interaction.interactionId}`);
                    console.log(`   Phone: ${interaction.phoneNumber}`);
                    console.log(`   Outcome: ${interaction.outcome}`);
                    console.log(`   Agent: ${interaction.agentId}`);
                    console.log(`   Created: ${interaction.createdAt}`);
                    console.log(`   Duration: ${interaction.duration}`);
                    console.log('');
                });

                // Count today's interactions
                const today = new Date().toISOString().split('T')[0];
                const todayInteractions = interactions.filter(i => i.createdAt.startsWith(today));
                console.log(`📅 Today's interactions: ${todayInteractions.length}`);
            }
        } else {
            console.log('❌ No interaction data available');
        }

        // Check specific stats endpoint
        console.log('\n📈 Checking dashboard statistics endpoint...');
        try {
            const statsResponse = await axios.get(`${API_BASE}/api/dashboard/stats`);
            console.log('✅ Stats API responded');
            console.log('Stats data:', JSON.stringify(statsResponse.data, null, 2));
        } catch (error) {
            if (error.response) {
                console.log(`❌ Stats API error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            } else {
                console.log(`❌ Stats API error: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('Error debugging call records:', error.message);
        if (error.response) {
            console.log('Error response:', error.response.status, error.response.data);
        }
    }
}

debugCallRecords();