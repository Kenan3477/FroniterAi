/**
 * Debug Exact Request Format
 * Tests what the frontend is actually sending to the backend
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const API_BASE = 'https://froniterai-production.up.railway.app';

async function debugRequestFormat() {
    console.log('🔍 DEBUGGING EXACT REQUEST FORMAT');
    
    try {
        // Get a real disposition
        const disposition = await prisma.disposition.findFirst({
            orderBy: { name: 'asc' }
        });
        
        if (!disposition) {
            console.log('❌ No dispositions found');
            return;
        }
        
        console.log(`\n📋 Using disposition: ${disposition.name} (${disposition.id})`);
        
        // Test different request formats
        console.log('\n🧪 Test 1: disposition.id format');
        await testFormat({
            disposition: {
                id: disposition.id,
                name: disposition.name,
                outcome: 'completed'
            },
            callSid: 'CA_test_format_1'
        });
        
        console.log('\n🧪 Test 2: dispositionId field format');
        await testFormat({
            dispositionId: disposition.id,
            disposition: {
                name: disposition.name,
                outcome: 'completed'
            },
            callSid: 'CA_test_format_2'
        });
        
        console.log('\n🧪 Test 3: Both disposition.id AND dispositionId');
        await testFormat({
            dispositionId: disposition.id,
            disposition: {
                id: disposition.id,
                name: disposition.name,
                outcome: 'completed'
            },
            callSid: 'CA_test_format_3'
        });
        
        console.log('\n🧪 Test 4: CUID as string only');
        await testFormat({
            dispositionId: disposition.id,
            callSid: 'CA_test_format_4'
        });
        
    } catch (error) {
        console.error('❌ DEBUG FAILED:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function testFormat(extraFields) {
    const requestBody = {
        phoneNumber: '07487723751',
        customerInfo: { firstName: 'Test', lastName: 'Customer' },
        callDuration: 30,
        agentId: '509',
        campaignId: 'manual-dial',
        recordingUrl: 'https://api.twilio.com/test-recording-url',
        ...extraFields
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE}/api/calls/save-call-data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    console.log(`📥 Response status: ${response.status}`);
    
    if (response.status === 200) {
        const responseData = await response.json();
        console.log(`✅ Disposition ID saved: ${responseData.data.callRecord.dispositionId}`);
        if (responseData.data.callRecord.dispositionId) {
            console.log('🎉 SUCCESS!');
        } else {
            console.log('❌ Still null');
        }
    } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText}`);
    }
}

debugRequestFormat();