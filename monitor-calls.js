// Real-time call monitoring script
const fetch = require('node-fetch');

async function monitorCallActivity() {
    console.log('🔍 Real-time Call Monitor Started...\n');
    
    const backendUrl = 'https://froniterai-production.up.railway.app';
    let lastCallId = null;
    let monitoringActive = true;
    
    console.log('📊 Monitoring for new calls every 2 seconds...');
    console.log('   Looking for: Call records, status changes, error patterns');
    console.log('   Focus: Landline vs mobile call differences\n');
    
    async function checkForNewCalls() {
        try {
            // Check for recent call records (last 5 minutes)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            
            const response = await fetch(`${backendUrl}/api/call-records?since=${fiveMinutesAgo}&limit=10`);
            
            if (response.ok) {
                const data = await response.json();
                const calls = data.calls || data.data || [];
                
                if (calls.length > 0) {
                    for (const call of calls) {
                        if (call.callId !== lastCallId) {
                            console.log(`📞 NEW CALL DETECTED: ${call.callId}`);
                            console.log(`   Number: ${call.phoneNumber}`);
                            console.log(`   Type: ${isLandline(call.phoneNumber) ? 'LANDLINE' : 'MOBILE'}`);
                            console.log(`   Status: ${call.outcome || 'In Progress'}`);
                            console.log(`   Duration: ${call.duration || 0}s`);
                            console.log(`   Agent: ${call.agentId}`);
                            console.log(`   Started: ${call.startTime}`);
                            console.log(`   Ended: ${call.endTime || 'Still active'}`);
                            
                            if (call.recording) {
                                console.log(`   Twilio SID: ${call.recording}`);
                            }
                            
                            console.log('');
                            lastCallId = call.callId;
                            
                            // If this is a landline call, provide extra analysis
                            if (isLandline(call.phoneNumber)) {
                                console.log('🚨 LANDLINE CALL ANALYSIS:');
                                
                                if (!call.endTime) {
                                    console.log('   - Call is still in progress');
                                } else {
                                    const duration = call.duration || 0;
                                    if (duration === 0) {
                                        console.log('   - ❌ Call failed immediately (0 duration)');
                                        console.log('   - Possible causes: Number unreachable, geographic restrictions');
                                    } else if (duration < 10) {
                                        console.log('   - ⚠️  Very short call (< 10s) - likely failed connection');
                                    } else {
                                        console.log('   - ✅ Call completed successfully');
                                    }
                                }
                                
                                // Check for common landline issues
                                if (call.outcome && call.outcome.includes('busy')) {
                                    console.log('   - Status: Busy signal (normal for landlines)');
                                } else if (call.outcome && call.outcome.includes('no-answer')) {
                                    console.log('   - Status: No answer (landlines may take longer to ring)');
                                } else if (call.outcome && call.outcome.includes('failed')) {
                                    console.log('   - ❌ Call failed - check number format and permissions');
                                }
                                
                                console.log('');
                            }
                        }
                    }
                }
            } else {
                console.log(`⚠️  Call records API returned: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Monitor error:', error.message);
        }
    }
    
    function isLandline(phoneNumber) {
        if (!phoneNumber) return false;
        
        // UK landline patterns (not starting with 07)
        if (phoneNumber.startsWith('+44') && !phoneNumber.startsWith('+447')) {
            return true;
        }
        
        // US landline patterns (area codes that are typically landlines)
        const usLandlineAreaCodes = ['212', '213', '214', '215', '216', '217', '218'];
        if (phoneNumber.startsWith('+1')) {
            const areaCode = phoneNumber.substring(2, 5);
            return usLandlineAreaCodes.includes(areaCode);
        }
        
        return false;
    }
    
    // Start monitoring
    const monitorInterval = setInterval(checkForNewCalls, 2000);
    
    console.log('🚀 Monitor active! Make your landline call now...\n');
    
    // Stop monitoring after 5 minutes
    setTimeout(() => {
        clearInterval(monitorInterval);
        console.log('\n⏹️  Monitoring stopped after 5 minutes');
        process.exit(0);
    }, 5 * 60 * 1000);
    
    // Initial check
    await checkForNewCalls();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Monitor stopped by user');
    process.exit(0);
});

monitorCallActivity().catch(console.error);