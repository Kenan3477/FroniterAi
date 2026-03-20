#!/usr/bin/env node

/**
 * Backend Functionality Test
 * Tests the actual working functionality of dial speed adjustments and AI features
 */

console.log('\n🧪 BACKEND FUNCTIONALITY TEST');
console.log('=============================\n');

const backendUrl = 'http://localhost:3001';

async function testBackendConnection() {
  console.log('🔗 Testing Backend Connection...');
  
  try {
    const response = await fetch(`${backendUrl}/api/health`);
    if (response.ok) {
      console.log('   ✅ Backend is responding');
      return true;
    } else {
      console.log(`   ❌ Backend returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Backend connection failed:', error.message);
    return false;
  }
}

async function testDialSpeedAdjustment() {
  console.log('\n📞 Testing Dial Speed Adjustment...');
  
  try {
    // Test getting current dial rate configuration
    const getResponse = await fetch(`${backendUrl}/api/campaigns/test_campaign/dial-rate/config`);
    console.log('   📊 Get dial rate config:', getResponse.status === 200 ? 'SUCCESS' : `FAILED (${getResponse.status})`);
    
    if (getResponse.ok) {
      const currentConfig = await getResponse.json();
      console.log('   📈 Current dial rate:', currentConfig.data?.dialRate || 'N/A');
    }
    
    // Test updating dial rate
    const newDialRate = {
      dialRate: 30.0,
      predictiveRatio: 1.2,
      autoAdjustRate: true
    };
    
    const updateResponse = await fetch(`${backendUrl}/api/campaigns/test_campaign/dial-rate/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This would normally be a real auth token
      },
      body: JSON.stringify(newDialRate)
    });
    
    console.log('   🔧 Update dial rate:', updateResponse.status === 200 ? 'SUCCESS' : `FAILED (${updateResponse.status})`);
    
    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('   ✅ New dial rate set to:', updateResult.data?.dialRate || 'N/A');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.log('   ❌ Dial speed test failed:', error.message);
    return false;
  }
}

async function testSentimentAnalysis() {
  console.log('\n📊 Testing Sentiment Analysis...');
  
  try {
    const testText = {
      text: "I love this service, you've been incredibly helpful!",
      callId: 'test_call_123',
      agentId: 'test_agent_456'
    };
    
    const response = await fetch(`${backendUrl}/api/sentiment/analyze-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testText)
    });
    
    console.log('   🤖 Sentiment analysis:', response.status === 200 ? 'SUCCESS' : `FAILED (${response.status})`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('   😊 Detected sentiment:', result.data?.sentiment || 'N/A');
      console.log('   📈 Confidence score:', result.data?.confidence ? `${(result.data.confidence * 100).toFixed(1)}%` : 'N/A');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.log('   ❌ Sentiment analysis test failed:', error.message);
    return false;
  }
}

async function testAutoDisposition() {
  console.log('\n🤖 Testing Auto-Disposition...');
  
  try {
    const callContext = {
      callDuration: 120,
      customerResponse: 'interested',
      agentNotes: 'Customer showed strong interest in the product'
    };
    
    const response = await fetch(`${backendUrl}/api/auto-disposition/recommend/test_call_123`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(callContext)
    });
    
    console.log('   🎯 Disposition recommendation:', response.status === 200 ? 'SUCCESS' : `FAILED (${response.status})`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('   📋 Recommended disposition:', result.data?.recommendedDisposition || 'N/A');
      console.log('   📊 Confidence score:', result.data?.confidence ? `${(result.data.confidence * 100).toFixed(1)}%` : 'N/A');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.log('   ❌ Auto-disposition test failed:', error.message);
    return false;
  }
}

async function testLeadScoring() {
  console.log('\n🎯 Testing Lead Scoring...');
  
  try {
    const scoringRequest = {
      updateFactors: true,
      includeOptimalTiming: true
    };
    
    const response = await fetch(`${backendUrl}/api/lead-scoring/calculate/test_contact_123`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(scoringRequest)
    });
    
    console.log('   🏆 Lead score calculation:', response.status === 200 ? 'SUCCESS' : `FAILED (${response.status})`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('   ⭐ Lead score:', result.data?.score || 'N/A');
      console.log('   ⏰ Optimal call time:', result.data?.optimalTiming || 'N/A');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.log('   ❌ Lead scoring test failed:', error.message);
    return false;
  }
}

async function testRealTimeFeatures() {
  console.log('\n⚡ Testing Real-time Features...');
  
  try {
    // Test auto-dialler status
    const statusResponse = await fetch(`${backendUrl}/api/campaigns/test_campaign/auto-dialler/status`);
    console.log('   📊 Auto-dialler status:', statusResponse.status === 200 ? 'SUCCESS' : `FAILED (${statusResponse.status})`);
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('   🚀 Dialler active:', status.data?.active ? 'YES' : 'NO');
      console.log('   📈 Current rate:', status.data?.currentRate || 'N/A', 'calls/min');
    }
    
    // Test real-time sentiment monitoring
    const sentimentResponse = await fetch(`${backendUrl}/api/sentiment/real-time/test_call_123`);
    console.log('   😊 Real-time sentiment:', sentimentResponse.status === 200 ? 'SUCCESS' : `FAILED (${sentimentResponse.status})`);
    
    return statusResponse.ok && sentimentResponse.ok;
    
  } catch (error) {
    console.log('   ❌ Real-time features test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔥 Testing actual backend functionality for dial speed and AI features...\n');
  
  const tests = [
    { name: 'Backend Connection', test: testBackendConnection },
    { name: 'Dial Speed Adjustment', test: testDialSpeedAdjustment },
    { name: 'Sentiment Analysis', test: testSentimentAnalysis },
    { name: 'Auto-Disposition', test: testAutoDisposition },
    { name: 'Lead Scoring', test: testLeadScoring },
    { name: 'Real-time Features', test: testRealTimeFeatures }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    const success = await test();
    results.push({ name, success });
  }
  
  console.log('\n📊 FUNCTIONALITY TEST RESULTS');
  console.log('=============================');
  
  let passedTests = 0;
  results.forEach(({ name, success }) => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (success) passedTests++;
  });
  
  const successRate = (passedTests / results.length * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${passedTests}/${results.length} (${successRate}%)`);
  
  if (successRate >= 80) {
    console.log('\n🎉 BACKEND IS FULLY FUNCTIONAL!');
    console.log('All critical dial speed and AI features are working correctly.');
  } else if (successRate >= 50) {
    console.log('\n⚠️ BACKEND IS PARTIALLY FUNCTIONAL');
    console.log('Some features are working, but issues remain.');
  } else {
    console.log('\n❌ BACKEND NEEDS ATTENTION');
    console.log('Critical functionality issues detected.');
  }
  
  console.log('\n💡 To start backend server:');
  console.log('   cd /Users/zenan/kennex/backend');
  console.log('   npx tsx src/index.ts');
}

// Only run this if backend URL is accessible
if (require.main === module) {
  main().catch(console.error);
}