/**
 * Immediate Debug Test for Disposition Save
 * Tests the exact call flow that's failing in console
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

// Use your exact API endpoint
const API_BASE = 'https://froniterai-production.up.railway.app';

async function debugDispositionSave() {
    console.log('🔍 IMMEDIATE DISPOSITION SAVE DEBUG');
    
    try {
        // 1. Check if save-call-data endpoint is responding
        console.log('\n1. Testing save-call-data endpoint basic response...');
        const testResponse = await fetch(`${API_BASE}/api/calls/save-call-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: '07487723751',
                customerInfo: { firstName: 'Test', lastName: 'Customer' },
                disposition: { id: 1, name: 'Test Disposition', outcome: 'completed' },
                callDuration: 30,
                agentId: '509',
                campaignId: 'manual-dial',
                callSid: 'CA_test_immediate_debug',
                recordingUrl: 'https://api.twilio.com/test-recording-url'
            })
        });

        console.log('Status:', testResponse.status);
        
        if (testResponse.status === 500) {
            const errorText = await testResponse.text();
            console.log('❌ 500 ERROR - Raw response:', errorText);
        } else if (testResponse.status === 200) {
            const responseData = await testResponse.json();
            console.log('✅ 200 SUCCESS:', responseData);
        }
        
        // 2. Check database state directly
        console.log('\n2. Checking current database state...');
        const callRecordCount = await prisma.callRecord.count();
        const dispositionCount = await prisma.disposition.count();
        const contactCount = await prisma.contact.count();
        
        console.log(`📊 Database Status:
        - Call Records: ${callRecordCount}
        - Dispositions: ${dispositionCount}
        - Contacts: ${contactCount}`);
        
        // 3. Show recent dispositions
        console.log('\n3. Available dispositions:');
        const dispositions = await prisma.disposition.findMany({
            take: 5,
            orderBy: { id: 'asc' }
        });
        dispositions.forEach(d => {
            console.log(`  - ID: ${d.id} | Name: ${d.name}`);
        });
        
    } catch (error) {
        console.error('❌ DEBUG FAILED:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

debugDispositionSave();