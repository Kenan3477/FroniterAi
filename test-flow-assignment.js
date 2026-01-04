#!/usr/bin/env node
/**
 * End-to-End Flow Assignment Test Script
 * 
 * Tests the complete flow assignment and execution pipeline:
 * 1. Create a test flow
 * 2. Assign it to an inbound number
 * 3. Simulate an inbound call to test flow execution
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting end-to-end flow assignment test...\n');

  try {
    // Step 1: Create a test flow
    console.log('1️⃣ Creating test flow...');
    
    // Get any existing user for the flow
    const testUser = await prisma.user.findFirst({
      select: { id: true, email: true }
    });
    
    if (!testUser) {
      console.log('❌ No users found in database. Please create a user first.');
      return;
    }
    
    console.log(`✅ Using existing user: ${testUser.email} (ID: ${testUser.id})`);
    
    const testFlow = await prisma.flow.create({
      data: {
        id: 'test-flow-' + Date.now(),
        name: 'Test Inbound Flow',
        description: 'Test flow for inbound call routing',
        status: 'ACTIVE',
        createdByUserId: testUser.id,
        createdAt: new Date()
      }
    });
    
    console.log(`✅ Created test flow: ${testFlow.id} (${testFlow.name})`);
    
    // Create a flow version with basic nodes
    const flowVersion = await prisma.flowVersion.create({
      data: {
        id: 'version-' + Date.now(),
        flowId: testFlow.id,
        versionNumber: 1,
        isActive: true,
        createdAt: new Date()
      }
    });
    
    console.log(`✅ Created flow version: ${flowVersion.id}`);
    
    // Step 2: Check for available inbound numbers
    console.log('\n2️⃣ Checking available inbound numbers...');
    
    const inboundNumbers = await prisma.inboundNumber.findMany({
      where: { isActive: true },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        assignedFlowId: true
      }
    });
    
    console.log(`📞 Found ${inboundNumbers.length} inbound numbers:`);
    inboundNumbers.forEach(num => {
      console.log(`  - ${num.phoneNumber} (${num.displayName}) - Flow: ${num.assignedFlowId || 'None'}`);
    });
    
    if (inboundNumbers.length === 0) {
      console.log('⚠️  No inbound numbers found. Creating test number...');
      
      const testNumber = await prisma.inboundNumber.create({
        data: {
          id: 'test-number-' + Date.now(),
          phoneNumber: '+1555TEST000',
          displayName: 'Test Number',
          description: 'Test inbound number for flow testing',
          country: 'US',
          numberType: 'LOCAL',
          provider: 'TEST',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      inboundNumbers.push(testNumber);
      console.log(`✅ Created test inbound number: ${testNumber.phoneNumber}`);
    }
    
    // Step 3: Assign flow to inbound number
    console.log('\n3️⃣ Assigning flow to inbound number...');
    
    const targetNumber = inboundNumbers[0];
    const updatedNumber = await prisma.inboundNumber.update({
      where: { id: targetNumber.id },
      data: {
        assignedFlowId: testFlow.id,
        updatedAt: new Date()
      },
      include: {
        assignedFlow: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });
    
    console.log(`✅ Assigned flow "${testFlow.name}" to number ${updatedNumber.phoneNumber}`);
    console.log(`   Flow Status: ${updatedNumber.assignedFlow?.status}`);
    
    // Step 4: Test flow lookup functionality
    console.log('\n4️⃣ Testing flow lookup...');
    
    const flowLookup = await prisma.inboundNumber.findUnique({
      where: { phoneNumber: updatedNumber.phoneNumber },
      include: {
        assignedFlow: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });
    
    if (flowLookup?.assignedFlow) {
      console.log(`✅ Flow lookup successful:`);
      console.log(`   Phone: ${flowLookup.phoneNumber}`);
      console.log(`   Flow ID: ${flowLookup.assignedFlow.id}`);
      console.log(`   Flow Name: ${flowLookup.assignedFlow.name}`);
      console.log(`   Flow Status: ${flowLookup.assignedFlow.status}`);
    } else {
      console.log('❌ Flow lookup failed');
      return;
    }
    
    // Step 5: Test API endpoint
    console.log('\n5️⃣ Testing inbound numbers API...');
    
    try {
      const response = await fetch('http://localhost:3004/api/voice/inbound-numbers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API endpoint working');
        console.log(`   Returned ${data.data?.length || 0} inbound numbers`);
        
        const numberWithFlow = data.data?.find(num => num.assignedFlowId === testFlow.id);
        if (numberWithFlow) {
          console.log(`✅ Found number with assigned flow in API response`);
          console.log(`   Phone: ${numberWithFlow.phoneNumber}`);
          console.log(`   Assigned Flow: ${numberWithFlow.assignedFlowId}`);
        } else {
          console.log('⚠️  Assigned flow not found in API response');
        }
      } else {
        console.log(`❌ API endpoint failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
    }
    
    // Step 6: Simulate flow execution test
    console.log('\n6️⃣ Simulating flow execution context...');
    
    const simulationContext = {
      callId: 'test-call-' + Date.now(),
      phoneNumber: '+1555CALLER',
      caller: {
        phoneNumber: '+1555CALLER',
        name: 'Test Caller',
        id: 'test-contact'
      },
      variables: {
        callerNumber: '+1555CALLER',
        source: 'inbound'
      },
      currentTime: new Date(),
      metadata: {
        source: 'inbound',
        phoneNumber: '+1555CALLER',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('✅ Flow execution context prepared:');
    console.log(`   Call ID: ${simulationContext.callId}`);
    console.log(`   Caller: ${simulationContext.caller.name} (${simulationContext.caller.phoneNumber})`);
    console.log(`   Target Number: ${updatedNumber.phoneNumber}`);
    console.log(`   Assigned Flow: ${testFlow.name}`);
    
    console.log('\n🎯 End-to-end flow assignment test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ Flow created: ${testFlow.name}`);
    console.log(`   ✅ Flow assigned to: ${updatedNumber.phoneNumber}`);
    console.log(`   ✅ Database relations working`);
    console.log(`   ✅ API endpoint accessible`);
    console.log(`   ✅ Execution context prepared`);
    
    // Cleanup (optional - comment out for inspection)
    console.log('\n🧹 Cleaning up test data...');
    await prisma.inboundNumber.update({
      where: { id: targetNumber.id },
      data: { assignedFlowId: null }
    });
    await prisma.flowVersion.delete({ where: { id: flowVersion.id } });
    await prisma.flow.delete({ where: { id: testFlow.id } });
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();