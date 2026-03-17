/**
 * Railway API Deployment Verification Test
 * Tests all critical endpoints after deployment to ensure correct data is returned
 */

const API_URL = 'https://froniterai-production.up.railway.app';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

// Track test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

async function testEndpoint(name, path, options = {}) {
  const { method = 'GET', expectedStatus = 200, validateResponse } = options;
  
  try {
    logInfo(`Testing: ${method} ${path}`);
    
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => null);
    
    // Check status code
    if (response.status !== expectedStatus) {
      logError(`Expected status ${expectedStatus}, got ${response.status}`);
      results.failed++;
      results.tests.push({ name, status: 'FAILED', reason: `Status code mismatch: ${response.status}` });
      return { success: false, status: response.status, data };
    }

    // Validate response structure if validator provided
    if (validateResponse) {
      const validation = validateResponse(data);
      if (!validation.valid) {
        logError(`Response validation failed: ${validation.reason}`);
        results.failed++;
        results.tests.push({ name, status: 'FAILED', reason: validation.reason });
        return { success: false, status: response.status, data };
      }
    }

    logSuccess(`${name} - OK`);
    console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    return { success: true, status: response.status, data };

  } catch (error) {
    logError(`${name} - ERROR: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAILED', reason: error.message });
    return { success: false, error: error.message };
  }
}

async function runTests() {
  logSection('🚀 Railway API Deployment Verification');
  logInfo(`Testing API at: ${API_URL}`);
  logInfo(`Timestamp: ${new Date().toISOString()}`);

  // 1. Health Check
  logSection('1. Health & Status Checks');
  await testEndpoint(
    'Health Check',
    '/health',
    {
      expectedStatus: 200,
      validateResponse: (data) => {
        if (!data || typeof data.status !== 'string') {
          return { valid: false, reason: 'Missing or invalid status field' };
        }
        return { valid: true };
      }
    }
  );

  // 2. Users Endpoints
  logSection('2. Users API');
  
  const usersResult = await testEndpoint(
    'Get All Users',
    '/api/users',
    {
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        return { valid: true };
      }
    }
  );

  // 3. Campaigns Endpoints
  logSection('3. Campaigns API');
  
  const campaignsResult = await testEndpoint(
    'Get All Campaigns',
    '/api/campaigns',
    {
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const campaigns = data.data || data;
        if (campaigns.length > 0) {
          const campaign = campaigns[0];
          if (!campaign.id || !campaign.name) {
            return { valid: false, reason: 'Campaign missing required fields (id, name)' };
          }
        }
        return { valid: true };
      }
    }
  );

  // 4. Contacts Endpoints
  logSection('4. Contacts API');
  
  await testEndpoint(
    'Get All Contacts',
    '/api/contacts',
    {
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        return { valid: true };
      }
    }
  );

  // 5. Call Records Endpoints
  logSection('5. Call Records API');
  
  await testEndpoint(
    'Get Call Records',
    '/api/call-records',
    {
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const records = data.data || data;
        if (records.length > 0) {
          const record = records[0];
          if (!record.id || !record.contactId) {
            return { valid: false, reason: 'Call record missing required fields' };
          }
        }
        return { valid: true };
      }
    }
  );

  // 6. Dispositions Endpoints
  logSection('6. Dispositions API');
  
  await testEndpoint(
    'Get Dispositions',
    '/api/dispositions',
    {
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const dispositions = data.data || data;
        if (dispositions.length > 0) {
          const disp = dispositions[0];
          if (!disp.id || !disp.label) {
            return { valid: false, reason: 'Disposition missing required fields' };
          }
        }
        return { valid: true };
      }
    }
  );

  // 7. Dial Queue Endpoints
  logSection('7. Dial Queue API');
  
  await testEndpoint(
    'Get Dial Queue Status',
    '/api/dial-queue/status',
    {
      validateResponse: (data) => {
        if (!data || typeof data !== 'object') {
          return { valid: false, reason: 'Response is not an object' };
        }
        return { valid: true };
      }
    }
  );

  // 8. Analytics Endpoints
  logSection('8. Analytics API');
  
  await testEndpoint(
    'Get Campaign Analytics',
    '/api/analytics/campaigns',
    {
      validateResponse: (data) => {
        if (!data || typeof data !== 'object') {
          return { valid: false, reason: 'Response is not an object' };
        }
        return { valid: true };
      }
    }
  );

  // 9. Realtime Endpoints
  logSection('9. Realtime & WebSocket');
  
  await testEndpoint(
    'Get Realtime Status',
    '/api/realtime/status',
    {
      expectedStatus: [200, 404], // May not have this endpoint
      validateResponse: (data) => {
        return { valid: true }; // Just checking if server responds
      }
    }
  );

  // 10. Database Health Check
  logSection('10. Database Connectivity');
  
  // Test if we can query database through API
  const dbHealthy = usersResult.success || campaignsResult.success;
  if (dbHealthy) {
    logSuccess('Database connectivity verified through API calls');
    results.passed++;
  } else {
    logError('Database connectivity issues detected');
    results.failed++;
  }

  // Final Report
  logSection('📊 Test Results Summary');
  console.log('\n');
  logInfo(`Total Tests: ${results.passed + results.failed}`);
  logSuccess(`Passed: ${results.passed}`);
  logError(`Failed: ${results.failed}`);
  
  if (results.warnings > 0) {
    logWarning(`Warnings: ${results.warnings}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Detailed Results:');
  console.log('─'.repeat(60));
  
  results.tests.forEach((test, index) => {
    const symbol = test.status === 'PASSED' ? '✓' : '✗';
    const color = test.status === 'PASSED' ? colors.green : colors.red;
    log(`${index + 1}. ${symbol} ${test.name}${test.reason ? ` - ${test.reason}` : ''}`, color);
  });

  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    logSuccess('🎉 ALL TESTS PASSED! Railway deployment is healthy.');
  } else {
    logError(`⚠️  ${results.failed} test(s) failed. Please review the issues above.`);
  }
  
  console.log('='.repeat(60) + '\n');

  // Return exit code
  return results.failed === 0 ? 0 : 1;
}

// Run tests
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
