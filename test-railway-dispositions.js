#!/usr/bin/env node

/**
 * Create missing disposition types using Railway's API
 * This approach uses the backend API directly to create the dispositions
 */

const fetch = require('node-fetch');

async function createDispositionsViaAPI() {
    console.log('🎯 Creating missing disposition types via Railway API...\n');
    
    const railwayUrl = 'https://froniterai-production.up.railway.app';
    
    const dispositions = [
        {
            id: 'disp_1766684993442',
            name: 'Customer Info Updated',
            description: 'Customer information was successfully updated'
        },
        {
            id: 'disp_1766684993443', 
            name: 'Call Completed',
            description: 'Call was completed successfully'
        },
        {
            id: 'disp_1766684993444',
            name: 'No Answer', 
            description: 'Customer did not answer the call'
        },
        {
            id: 'disp_1766684993445',
            name: 'Voicemail',
            description: 'Left a voicemail for the customer'
        },
        {
            id: 'disp_1766684993446',
            name: 'Busy Signal',
            description: 'Customer line was busy'
        }
    ];
    
    console.log(`📍 Target: ${railwayUrl}`);
    console.log(`📋 Creating ${dispositions.length} disposition types...\n`);
    
    // Method 1: Try using the create-types endpoint we added
    try {
        console.log('🔄 Method 1: Using create-types endpoint...');
        
        const response = await fetch(`${railwayUrl}/api/dispositions/create-types`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dispositions })
        });
        
        const result = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${result}`);
        
        if (response.ok) {
            console.log('✅ Successfully created dispositions via API!');
            return true;
        }
        
    } catch (error) {
        console.log(`❌ Method 1 failed: ${error.message}`);
    }
    
    // Method 2: Try creating them individually via save-call-data
    console.log('\n🔄 Method 2: Creating via save-call-data calls...');
    
    for (const disposition of dispositions) {
        try {
            const testCall = {
                callId: `disposition_creation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                dispositionId: disposition.id,
                agentId: 'system-agent',
                contactId: 'temp-contact',
                notes: `Creating disposition: ${disposition.name}`,
                customerInfo: {
                    name: 'System',
                    phone: '+1000000000'
                }
            };
            
            const response = await fetch(`${railwayUrl}/api/calls/save-call-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testCall)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                console.log(`✅ Disposition ${disposition.id} accessible (${disposition.name})`);
            } else {
                console.log(`❌ Disposition ${disposition.id} failed: ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.log(`❌ Error testing ${disposition.id}: ${error.message}`);
        }
    }
    
    return false;
}

// Method 3: Test the specific failing disposition
async function testSpecificDisposition() {
    console.log('\n🎯 Testing the specific failing disposition...');
    
    const railwayUrl = 'https://froniterai-production.up.railway.app';
    
    const testCall = {
        callId: `test_disposition_${Date.now()}`,
        dispositionId: 'disp_1766684993442', // The one that was originally missing
        agentId: 'system-agent',
        contactId: 'test-contact',
        notes: 'Testing disposition save functionality',
        customerInfo: {
            name: 'Test Customer',
            phone: '+1234567890'
        }
    };
    
    try {
        const response = await fetch(`${railwayUrl}/api/calls/save-call-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCall)
        });
        
        const result = await response.json();
        
        console.log(`Response Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(result, null, 2));
        
        if (response.ok) {
            if (result.warning && result.warning.includes('Disposition ID not found')) {
                console.log('\n❌ ISSUE: Disposition disp_1766684993442 still not found in Railway database');
                console.log('🔧 Need to create the disposition types in Railway database');
                return false;
            } else {
                console.log('\n✅ SUCCESS: Disposition save working on Railway!');
                return true;
            }
        } else {
            console.log('\n❌ API call failed');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 RAILWAY DISPOSITION CREATION TEST');
    console.log('===================================\n');
    
    const success = await createDispositionsViaAPI();
    const testResult = await testSpecificDisposition();
    
    console.log('\n🎉 SUMMARY');
    console.log('=========');
    console.log(`API Creation: ${success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Test Result: ${testResult ? '✅ Working' : '❌ Still broken'}`);
    
    if (!testResult) {
        console.log('\n📝 NEXT STEPS:');
        console.log('1. The dispositions need to be created directly in Railway PostgreSQL');
        console.log('2. Use Railway dashboard or connect via psql');
        console.log('3. Run the SQL commands manually');
        console.log('\nSQL to run:');
        console.log(`INSERT INTO "Disposition" (id, name, description, "createdAt", "updatedAt") VALUES`);
        console.log(`('disp_1766684993442', 'Customer Info Updated', 'Customer information was successfully updated', NOW(), NOW()),`);
        console.log(`('disp_1766684993443', 'Call Completed', 'Call was completed successfully', NOW(), NOW()),`);
        console.log(`('disp_1766684993444', 'No Answer', 'Customer did not answer the call', NOW(), NOW()),`);
        console.log(`('disp_1766684993445', 'Voicemail', 'Left a voicemail for the customer', NOW(), NOW()),`);
        console.log(`('disp_1766684993446', 'Busy Signal', 'Customer line was busy', NOW(), NOW())`);
        console.log(`ON CONFLICT (id) DO NOTHING;`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}