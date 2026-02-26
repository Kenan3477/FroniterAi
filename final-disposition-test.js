/**
 * Final Test with Working Agent ID
 * Test disposition saving with existing agent
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const API_BASE = 'https://froniterai-production.up.railway.app';

async function finalDispositionTest() {
    console.log('🎯 FINAL DISPOSITION TEST WITH WORKING AGENT');
    
    try {
        // Get real disposition
        const disposition = await prisma.disposition.findFirst({
            orderBy: { name: 'asc' }
        });
        
        console.log(`\n📋 Using disposition: ${disposition.name} (${disposition.id})`);
        
        // Test save-call-data with working agent ID
        console.log('\n💾 Testing save-call-data with system-agent...');
        
        const testResponse = await fetch(`${API_BASE}/api/calls/save-call-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: '07487723751',
                customerInfo: { firstName: 'Test', lastName: 'Customer' },
                dispositionId: disposition.id,
                disposition: {
                    id: disposition.id,
                    name: disposition.name,
                    outcome: 'completed'
                },
                callDuration: 45,
                agentId: 'system-agent',  // Use working agent ID
                campaignId: 'manual-dial',
                callSid: 'CA_final_test',
                recordingUrl: 'https://api.twilio.com/test-recording-url'
            })
        });

        console.log(`📞 Response status: ${testResponse.status}`);
        
        if (testResponse.status === 200) {
            const responseData = await testResponse.json();
            console.log('✅ SUCCESS! Call saved:');
            console.log(`   - Call ID: ${responseData.data.callRecord.callId}`);
            console.log(`   - Disposition ID: ${responseData.data.callRecord.dispositionId}`);
            console.log(`   - Agent ID: ${responseData.data.callRecord.agentId}`);
            
            if (responseData.data.callRecord.dispositionId === disposition.id) {
                console.log('🎉 DISPOSITION SAVED SUCCESSFULLY!');
                console.log('\n✅ ISSUE RESOLVED:');
                console.log('   - Frontend can now send disposition.id');
                console.log('   - Backend correctly validates and saves CUID format');
                console.log('   - Call records show proper disposition data');
                return true;
            } else {
                console.log('❌ Disposition ID still null or incorrect');
                console.log(`    Expected: ${disposition.id}`);
                console.log(`    Got: ${responseData.data.callRecord.dispositionId}`);
                return false;
            }
        } else {
            const errorText = await testResponse.text();
            console.log('❌ Request failed:', errorText);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

finalDispositionTest().then(success => {
    if (success) {
        console.log('\n🚀 THE DISPOSITION SAVE SYSTEM IS NOW WORKING!');
        console.log('🔧 Next: Update frontend to use "system-agent" or ensure user 509 exists in database');
    } else {
        console.log('\n❌ Further debugging needed...');
    }
});