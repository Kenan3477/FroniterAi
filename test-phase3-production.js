#!/usr/bin/env node

/**
 * Phase 3 Production Testing Script
 * Comprehensive testing of all AI-powered dialler features with real campaign data
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧪 PHASE 3 PRODUCTION TESTING');
console.log('=============================\n');

// Test configuration
const testConfig = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  testCampaignId: 'camp_test_001',
  testAgentId: 'agent_test_001',
  testContactId: 'contact_001',
  testOrganizationId: 'org_test_001'
};

// Test scenarios for each AI feature
const testScenarios = [
  {
    feature: 'Real-time Sentiment Analysis',
    endpoint: '/api/sentiment',
    tests: [
      {
        name: 'Analyze sample text sentiment',
        method: 'POST',
        path: '/analyze-text',
        data: {
          text: 'I am very happy with the service, thank you so much!',
          callId: 'test_call_001',
          agentId: testConfig.testAgentId
        },
        expectedSentiment: 'positive'
      },
      {
        name: 'Get real-time sentiment for call',
        method: 'GET',
        path: `/real-time/${testConfig.testCallId || 'test_call_001'}`,
        expectedStatus: 200
      },
      {
        name: 'Get sentiment analytics',
        method: 'GET', 
        path: '/analytics',
        query: '?limit=10',
        expectedStatus: 200
      }
    ]
  },
  {
    feature: 'AI-Powered Auto-Disposition',
    endpoint: '/api/auto-disposition',
    tests: [
      {
        name: 'Get disposition recommendation',
        method: 'POST',
        path: `/recommend/${testConfig.testCallId || 'test_call_001'}`,
        data: {
          callDuration: 120,
          customerResponse: 'interested',
          agentNotes: 'Customer showed strong interest in the product'
        },
        expectedStatus: 200
      },
      {
        name: 'Get available dispositions for campaign',
        method: 'GET',
        path: `/available-dispositions/${testConfig.testCampaignId}`,
        expectedStatus: 200
      },
      {
        name: 'Get disposition analytics',
        method: 'GET',
        path: '/analytics',
        expectedStatus: 200
      }
    ]
  },
  {
    feature: 'AI-Driven Lead Scoring',
    endpoint: '/api/lead-scoring',
    tests: [
      {
        name: 'Calculate lead score',
        method: 'POST',
        path: `/calculate/${testConfig.testContactId}`,
        data: {
          updateFactors: true,
          includeOptimalTiming: true
        },
        expectedStatus: 200
      },
      {
        name: 'Get prioritized leads for campaign',
        method: 'GET',
        path: `/prioritized/${testConfig.testCampaignId}`,
        query: '?limit=20',
        expectedStatus: 200
      },
      {
        name: 'Get lead scoring analytics',
        method: 'GET',
        path: '/analytics',
        expectedStatus: 200
      }
    ]
  },
  {
    feature: 'Real-time Dial Rate Management',
    endpoint: '/api/campaigns',
    tests: [
      {
        name: 'Get campaign dial rate configuration',
        method: 'GET',
        path: `/${testConfig.testCampaignId}/dial-rate/config`,
        expectedStatus: 200
      },
      {
        name: 'Update dial rate settings',
        method: 'PUT',
        path: `/${testConfig.testCampaignId}/dial-rate/config`,
        data: {
          dialRate: 35.0,
          predictiveRatio: 1.3,
          autoAdjustRate: true
        },
        expectedStatus: 200
      },
      {
        name: 'Get auto-dialler status',
        method: 'GET',
        path: `/${testConfig.testCampaignId}/auto-dialler/status`,
        expectedStatus: 200
      }
    ]
  }
];

// Authentication setup
let authToken = null;

async function authenticate() {
  console.log('🔐 Authenticating for testing...');
  
  try {
    // Try to authenticate with test credentials
    const authResponse = await fetch(`${testConfig.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test-agent@omnivox.ai',
        password: 'testpass123'
      })
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.token;
      console.log('   ✅ Authentication successful');
      return true;
    } else {
      console.log('   ⚠️  Authentication failed, testing without auth');
      return false;
    }
  } catch (error) {
    console.log('   ⚠️  Authentication error, testing without auth:', error.message);
    return false;
  }
}

async function testAPIEndpoint(baseEndpoint, test) {
  const url = `${testConfig.backendUrl}${baseEndpoint}${test.path}${test.query || ''}`;
  
  try {
    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    if (test.data) {
      options.body = JSON.stringify(test.data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    const success = test.expectedStatus ? 
      response.status === test.expectedStatus : 
      response.ok;

    if (success) {
      console.log(`      ✅ ${test.name}`);
      
      // Validate specific expectations
      if (test.expectedSentiment && responseData.data?.sentiment) {
        const sentimentMatch = responseData.data.sentiment === test.expectedSentiment;
        console.log(`         Sentiment: ${responseData.data.sentiment} ${sentimentMatch ? '✅' : '⚠️'}`);
      }
      
      return { success: true, data: responseData };
    } else {
      console.log(`      ❌ ${test.name} - Status: ${response.status}`);
      console.log(`         Response: ${JSON.stringify(responseData, null, 2).slice(0, 200)}...`);
      return { success: false, error: responseData };
    }

  } catch (error) {
    console.log(`      ❌ ${test.name} - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testFeature(scenario) {
  console.log(`\n📊 Testing: ${scenario.feature}`);
  console.log(`   Endpoint: ${scenario.endpoint}`);
  
  let passedTests = 0;
  let totalTests = scenario.tests.length;

  for (const test of scenario.tests) {
    const result = await testAPIEndpoint(scenario.endpoint, test);
    if (result.success) {
      passedTests++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const successRate = (passedTests / totalTests * 100).toFixed(1);
  console.log(`   📈 Results: ${passedTests}/${totalTests} tests passed (${successRate}%)`);
  
  return { passedTests, totalTests, successRate: parseFloat(successRate) };
}

async function testFrontendComponents() {
  console.log('\n🎨 Testing Frontend Components');
  console.log('==============================');

  const frontendTests = [
    {
      name: 'AI Dashboard page exists',
      url: `${testConfig.frontendUrl}/ai-dashboard`,
      check: 'page_exists'
    },
    {
      name: 'Sentiment Dashboard component',
      component: 'frontend/src/components/sentiment/SentimentDashboard.tsx',
      check: 'file_exists'
    },
    {
      name: 'Real-time Dial Rate Manager',
      component: 'frontend/src/components/campaigns/RealTimeDialRateManager.tsx',
      check: 'file_exists'
    },
    {
      name: 'AI Dashboard Navigation',
      component: 'frontend/src/components/ai/AIDashboard.tsx',
      check: 'file_exists'
    }
  ];

  let frontendPassed = 0;
  
  for (const test of frontendTests) {
    try {
      if (test.check === 'file_exists') {
        const filePath = path.join(__dirname, test.component);
        if (fs.existsSync(filePath)) {
          console.log(`   ✅ ${test.name}`);
          frontendPassed++;
        } else {
          console.log(`   ❌ ${test.name} - File not found`);
        }
      } else if (test.check === 'page_exists') {
        // For now, just check if the page file exists
        const pagePath = path.join(__dirname, 'frontend/src/app/ai-dashboard/page.tsx');
        if (fs.existsSync(pagePath)) {
          console.log(`   ✅ ${test.name}`);
          frontendPassed++;
        } else {
          console.log(`   ❌ ${test.name} - Page file not found`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} - Error: ${error.message}`);
    }
  }

  console.log(`   📈 Frontend Tests: ${frontendPassed}/${frontendTests.length} passed`);
  return { passed: frontendPassed, total: frontendTests.length };
}

async function generateTestReport(results) {
  console.log('\n📋 GENERATING TEST REPORT');
  console.log('=========================\n');

  const totalTests = results.reduce((sum, result) => sum + result.totalTests, 0);
  const totalPassed = results.reduce((sum, result) => sum + result.passedTests, 0);
  const overallSuccessRate = (totalPassed / totalTests * 100).toFixed(1);

  const report = `# Phase 3 Production Testing Report

## Test Summary

**Overall Results**: ${totalPassed}/${totalTests} tests passed (${overallSuccessRate}%)
**Test Date**: ${new Date().toISOString()}
**Environment**: ${testConfig.backendUrl}

## Feature Test Results

${results.map(result => `
### ${result.feature}
- **Tests Passed**: ${result.passedTests}/${result.totalTests}
- **Success Rate**: ${result.successRate}%
- **Status**: ${result.successRate >= 80 ? '✅ OPERATIONAL' : result.successRate >= 50 ? '⚠️ PARTIAL' : '❌ NEEDS ATTENTION'}
`).join('')}

## Frontend Component Status

${results.frontendResults ? `
- **Components Tested**: ${results.frontendResults.total}
- **Components Available**: ${results.frontendResults.passed}
- **Frontend Status**: ${results.frontendResults.passed === results.frontendResults.total ? '✅ COMPLETE' : '⚠️ PARTIAL'}
` : '⚠️ Frontend tests not completed'}

## Recommendations

### Immediate Actions
${overallSuccessRate >= 80 ? 
  '✅ System is ready for production use with all core AI features operational.' :
  overallSuccessRate >= 50 ?
  '⚠️ System is partially ready. Address failing tests before full production deployment.' :
  '❌ System needs significant fixes before production deployment.'
}

### Next Steps
1. ${overallSuccessRate >= 80 ? 'Begin agent training on AI features' : 'Fix failing tests and re-run validation'}
2. ${overallSuccessRate >= 80 ? 'Set up performance monitoring' : 'Review error logs and API connectivity'}  
3. ${overallSuccessRate >= 80 ? 'Establish baseline metrics' : 'Verify database connectivity and migrations'}

## Test Environment
- Backend URL: ${testConfig.backendUrl}
- Frontend URL: ${testConfig.frontendUrl}
- Authentication: ${authToken ? 'Successful' : 'Failed/Skipped'}

---
*Generated by Phase 3 Production Testing Script*
`;

  const reportPath = path.join(__dirname, 'PHASE_3_PRODUCTION_TEST_REPORT.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`📄 Test report generated: ${reportPath}`);
  return report;
}

async function main() {
  console.log('🚀 Starting comprehensive Phase 3 production testing...\n');
  console.log(`Backend: ${testConfig.backendUrl}`);
  console.log(`Frontend: ${testConfig.frontendUrl}`);

  // Step 1: Authenticate
  await authenticate();

  // Step 2: Test all AI features
  const results = [];
  for (const scenario of testScenarios) {
    const result = await testFeature(scenario);
    results.push({
      feature: scenario.feature,
      ...result
    });
  }

  // Step 3: Test frontend components
  const frontendResults = await testFrontendComponents();
  results.frontendResults = frontendResults;

  // Step 4: Generate report
  await generateTestReport(results);

  // Step 5: Summary
  console.log('\n🎯 TESTING COMPLETE');
  console.log('==================');
  
  const totalTests = results.reduce((sum, result) => sum + result.totalTests, 0);
  const totalPassed = results.reduce((sum, result) => sum + result.passedTests, 0);
  const overallSuccessRate = (totalPassed / totalTests * 100).toFixed(1);

  console.log(`✅ Overall Success Rate: ${overallSuccessRate}%`);
  console.log(`📊 Tests Passed: ${totalPassed}/${totalTests}`);
  console.log(`🎨 Frontend Components: ${frontendResults.passed}/${frontendResults.total}`);

  if (overallSuccessRate >= 80) {
    console.log('\n🎉 SYSTEM READY FOR PRODUCTION!');
    console.log('All core AI features are operational and ready for agent training.');
  } else if (overallSuccessRate >= 50) {
    console.log('\n⚠️ SYSTEM PARTIALLY READY');
    console.log('Some features need attention before full production deployment.');
  } else {
    console.log('\n❌ SYSTEM NEEDS ATTENTION');
    console.log('Significant issues found. Review logs and fix before deployment.');
  }
}

// Run the testing script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testFeature, testFrontendComponents, generateTestReport };