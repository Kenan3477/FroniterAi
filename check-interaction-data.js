const axios = require('axios');

async function checkInteractions() {
    try {
        console.log('🔍 Checking interactions and call data...\n');

        const API_BASE = 'https://froniterai-production.up.railway.app';
        
        // Check interactions endpoint
        console.log('💬 Checking interactions...');
        const response = await axios.get(`${API_BASE}/api/interactions`, {
            params: { limit: 50 }
        });
        
        if (response.status === 200) {
            console.log('✅ Interactions API responded successfully');
            console.log('Response structure:', Object.keys(response.data));
            
            if (response.data.success && response.data.data) {
                const interactions = response.data.data;
                console.log(`💬 Found ${interactions.length} interaction records`);
                
                if (interactions.length > 0) {
                    console.log('\n📋 All interactions:');
                    interactions.forEach((interaction, index) => {
                        console.log(`${index + 1}. ID: ${interaction.interactionId}`);
                        console.log(`   Phone: ${interaction.phoneNumber}`);
                        console.log(`   Outcome: ${interaction.outcome || 'No outcome'}`);
                        console.log(`   Agent: ${interaction.agentId}`);
                        console.log(`   Duration: ${interaction.duration || 0}s`);
                        console.log(`   Created: ${interaction.createdAt}`);
                        console.log(`   Type: ${interaction.type}`);
                        console.log('');
                    });

                    // Today's interactions
                    const today = new Date().toISOString().split('T')[0];
                    const todayInteractions = interactions.filter(i => 
                        i.createdAt.startsWith(today)
                    );
                    console.log(`📅 Today's interactions: ${todayInteractions.length}`);

                    // Successful interactions (with outcomes)
                    const successfulInteractions = interactions.filter(i => 
                        i.outcome && i.outcome !== null && i.outcome !== ''
                    );
                    console.log(`✅ Interactions with outcomes: ${successfulInteractions.length}`);

                    // Kenan's interactions
                    const kenanInteractions = interactions.filter(i => 
                        i.agentId && (i.agentId.includes('kenan') || i.agentId.includes('Kenan') || i.agentId === '2')
                    );
                    console.log(`👨‍💼 Kenan's interactions: ${kenanInteractions.length}`);

                    if (kenanInteractions.length > 0) {
                        console.log('\n📞 Kenan\'s recent calls:');
                        kenanInteractions.slice(0, 5).forEach((interaction, index) => {
                            console.log(`${index + 1}. Phone: ${interaction.phoneNumber}, Outcome: ${interaction.outcome || 'None'}, Created: ${interaction.createdAt}`);
                        });
                    }
                } else {
                    console.log('❌ No interaction records found');
                }
            } else {
                console.log('❌ No interaction data in response');
            }
        } else {
            console.log(`❌ Interactions API error: ${response.status}`);
        }

        // Check call records endpoint (if it exists)
        console.log('\n📊 Checking call records endpoint...');
        try {
            const callRecordsResponse = await axios.get(`${API_BASE}/api/call-records`, {
                params: { limit: 50 }
            });
            
            if (callRecordsResponse.status === 200 && callRecordsResponse.data.success) {
                const callRecords = callRecordsResponse.data.data || callRecordsResponse.data;
                console.log(`📞 Found ${callRecords.length} call records`);
                
                if (callRecords.length > 0) {
                    console.log('\n📋 Recent call records:');
                    callRecords.slice(0, 5).forEach((call, index) => {
                        console.log(`${index + 1}. Call: ${call.id || call.callId}`);
                        console.log(`   Phone: ${call.phoneNumber || call.phone}`);
                        console.log(`   Outcome: ${call.outcome || call.status}`);
                        console.log(`   Agent: ${call.agentId}`);
                        console.log(`   Duration: ${call.duration || 0}s`);
                        console.log(`   Created: ${call.createdAt}`);
                        console.log('');
                    });
                }
            }
        } catch (callError) {
            console.log('❌ Call records endpoint not available or error:', callError.response?.status || callError.message);
        }

    } catch (error) {
        console.error('Error checking interactions:', error.message);
        if (error.response) {
            console.log('Error response:', error.response.status, error.response.data);
        }
    }
}

checkInteractions();