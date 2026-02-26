/**
 * Test Updated Disposition System
 * Tests the complete disposition flow with CUID IDs
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

// Use your exact API endpoint
const API_BASE = 'https://froniterai-production.up.railway.app';

async function testUpdatedDispositionSystem() {
    console.log('🔍 TESTING UPDATED DISPOSITION SYSTEM');
    
    try {
        // 1. Get available dispositions with CUID IDs
        console.log('\n1. Getting available dispositions...');
        const dispositions = await prisma.disposition.findMany({
            take: 3,
            orderBy: { name: 'asc' }
        });
        
        console.log('📋 Available dispositions:');
        dispositions.forEach(d => {
            console.log(`  - ID: ${d.id} | Name: ${d.name}`);
        });
        
        if (dispositions.length === 0) {
            console.log('❌ No dispositions found in database');
            return;
        }
        
        // 2. Test save-call-data with proper CUID disposition ID
        const testDisposition = dispositions[0];
        console.log(`\n2. Testing save-call-data with disposition: ${testDisposition.name} (${testDisposition.id})`);
        
        const testResponse = await fetch(`${API_BASE}/api/calls/save-call-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: '07487723751',
                customerInfo: { firstName: 'Test', lastName: 'Customer' },
                disposition: {
                    id: testDisposition.id,
                    name: testDisposition.name,
                    outcome: 'completed'
                },
                dispositionId: testDisposition.id, // Explicit ID field
                callDuration: 45,
                agentId: '509',
                campaignId: 'manual-dial',
                callSid: 'CA_test_updated_system',
                recordingUrl: 'https://api.twilio.com/test-recording-url'
            })
        });

        console.log('📞 Call save status:', testResponse.status);
        
        if (testResponse.status === 200) {
            const responseData = await testResponse.json();
            console.log('✅ SUCCESS! Call saved with disposition:');
            console.log(`   - Disposition ID: ${responseData.data.callRecord.dispositionId}`);
            console.log(`   - Call ID: ${responseData.data.callRecord.callId}`);
            
            if (responseData.data.callRecord.dispositionId === testDisposition.id) {
                console.log('🎉 DISPOSITION ID CORRECTLY SAVED!');
            } else {
                console.log('⚠️ Disposition ID mismatch:');
                console.log(`    Expected: ${testDisposition.id}`);
                console.log(`    Got: ${responseData.data.callRecord.dispositionId}`);
            }
        } else {
            const errorText = await testResponse.text();
            console.log('❌ FAILED:', errorText);
        }
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testUpdatedDispositionSystem();