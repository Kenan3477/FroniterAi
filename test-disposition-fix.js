const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://frontierai-production.up.railway.app';

async function testDispositionFix() {
    console.log('\n🔍 TESTING DISPOSITION SAVE FIXES');
    console.log('================================');
    
    try {
        // First, let's check what call records exist
        const response = await axios.get(`${BASE_URL}/api/call-records`, {
            headers: {
                'Authorization': `Bearer ${process.env.JWT_TOKEN}`
            }
        });
        
        console.log(`\n📊 Current Call Records: ${response.data.length}`);
        response.data.forEach((record, index) => {
            console.log(`${index + 1}. ID: ${record.id}, Phone: ${record.phoneNumber || 'Unknown'}, Status: ${record.status}`);
        });
        
        // If we have records, let's try to save a disposition on the latest one
        if (response.data.length > 0) {
            const latestRecord = response.data[response.data.length - 1];
            console.log(`\n📞 Testing disposition save on record: ${latestRecord.id}`);
            
            const dispositionData = {
                callId: latestRecord.id,
                outcome: 'completed',
                notes: 'Test disposition fix verification',
                contactable: true,
                interested: true
            };
            
            const dispositionResponse = await axios.post(`${BASE_URL}/api/dispositions`, dispositionData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.JWT_TOKEN}`
                }
            });
            
            console.log(`✅ Disposition saved successfully!`);
            console.log(`📋 Disposition ID: ${dispositionResponse.data.id}`);
        } else {
            console.log('\n⚠️  No call records found to test disposition on');
            
            // Let's create a test call record and then test disposition
            console.log('\n🔧 Creating test call record for disposition testing...');
            
            const testCallData = {
                phoneNumber: '+1234567890',
                status: 'completed',
                duration: 30
            };
            
            const callResponse = await axios.post(`${BASE_URL}/api/call-records`, testCallData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.JWT_TOKEN}`
                }
            });
            
            console.log(`✅ Test call record created: ${callResponse.data.id}`);
            
            // Now test disposition on this record
            const dispositionData = {
                callId: callResponse.data.id,
                outcome: 'completed',
                notes: 'Test disposition on newly created record',
                contactable: true,
                interested: false
            };
            
            const dispositionResponse = await axios.post(`${BASE_URL}/api/dispositions`, dispositionData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.JWT_TOKEN}`
                }
            });
            
            console.log(`✅ Disposition saved on test record!`);
            console.log(`📋 Disposition ID: ${dispositionResponse.data.id}`);
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('\n🔑 Note: Make sure JWT_TOKEN environment variable is set correctly');
        }
    }
}

// Run the test
testDispositionFix();