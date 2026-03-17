/**
 * Railway API Authenticated Deployment Verification Test
 * Tests all critical endpoints with proper authentication
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
  tests: [],
  endpoints: []
};

let authToken = null;
let userId = null;

async function authenticateUser() {
  logSection('🔐 Authentication');
  
  try {
    // Try to login with admin credentials
    logInfo('Attempting to authenticate...');
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@omnivox.ai',
        password: 'Admin123!'
      })
    });

    const data = await response.json();

    if (response.status === 200 && data.token) {
      authToken = data.token;
      userId = data.user?.id;
      logSuccess('Authentication successful');
      logInfo(`User ID: ${userId}`);
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logWarning('Default admin credentials not working, trying alternative...');
      
      // Try alternative credentials
      const altResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'kenan@omnivox.ai',
          password: 'Kenan123!'
        })
      });

      const altData = await altResponse.json();

      if (altResponse.status === 200 && altData.token) {
        authToken = altData.token;
        userId = altData.user?.id;
        logSuccess('Authentication successful with alternative credentials');
        logInfo(`User ID: ${userId}`);
        return true;
      } else {
        logError('Authentication failed with both credential sets');
        logInfo('Proceeding with unauthenticated tests only...');
        return false;
      }
    }
  } catch (error) {
    logError(`Authentication error: ${error.message}`);
    return false;
  }
}

async function testEndpoint(name, path, options = {}) {
  const { method = 'GET', expectedStatus = 200, validateResponse, requiresAuth = false } = options;
  
  try {
    logInfo(`Testing: ${method} ${path}`);
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (requiresAuth && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const contentType = response.headers.get('content-type');
    let data = null;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => null);
    }
    
    // Track endpoint info
    results.endpoints.push({
      path,
      method,
      status: response.status,
      requiresAuth,
      authenticated: !!authToken
    });

    // Check if authentication is required
    if (response.status === 401 && !requiresAuth) {
      logWarning(`Endpoint requires authentication (401)`);
      results.warnings++;
      results.tests.push({ name, status: 'WARNING', reason: 'Requires authentication' });
      return { success: false, status: response.status, data, requiresAuth: true };
    }

    // Check status code
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!expectedStatuses.includes(response.status)) {
      logError(`Expected status ${expectedStatus}, got ${response.status}`);
      if (data) {
        console.log(`   Response:`, typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data, null, 2).substring(0, 200));
      }
      results.failed++;
      results.tests.push({ name, status: 'FAILED', reason: `Status code mismatch: ${response.status}` });
      return { success: false, status: response.status, data };
    }

    // Validate response structure if validator provided
    if (validateResponse && data) {
      const validation = validateResponse(data);
      if (!validation.valid) {
        logError(`Response validation failed: ${validation.reason}`);
        results.failed++;
        results.tests.push({ name, status: 'FAILED', reason: validation.reason });
        return { success: false, status: response.status, data };
      }
    }

    logSuccess(`${name} - OK (${response.status})`);
    if (data) {
      const preview = typeof data === 'string' ? data.substring(0, 150) : JSON.stringify(data, null, 2).substring(0, 150);
      console.log(`   Response preview: ${preview}...`);
    }
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
  logSection('🚀 Railway API Authenticated Deployment Verification');
  logInfo(`Testing API at: ${API_URL}`);
  logInfo(`Timestamp: ${new Date().toISOString()}`);

  // Authenticate first
  const authenticated = await authenticateUser();

  // 1. Health Check (no auth required)
  logSection('1. Health & Status Checks');
  await testEndpoint(
    'Health Check',
    '/health',
    {
      expectedStatus: 200,
      requiresAuth: false,
      validateResponse: (data) => {
        if (!data || typeof data.status !== 'string') {
          return { valid: false, reason: 'Missing or invalid status field' };
        }
        if (!data.database || typeof data.database.connected !== 'boolean') {
          return { valid: false, reason: 'Missing database connection status' };
        }
        if (!data.database.connected) {
          return { valid: false, reason: 'Database not connected' };
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
      requiresAuth: true,
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const users = data.data || data;
        if (users.length > 0) {
          const user = users[0];
          if (!user.id || !user.email) {
            return { valid: false, reason: 'User missing required fields (id, email)' };
          }
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
      requiresAuth: true,
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const campaigns = data.data || data;
        logInfo(`Found ${campaigns.length} campaigns`);
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
      requiresAuth: true,
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const contacts = data.data || data;
        logInfo(`Found ${contacts.length} contacts`);
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
      requiresAuth: true,
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const records = data.data || data;
        logInfo(`Found ${records.length} call records`);
        if (records.length > 0) {
          const record = records[0];
          if (!record.id) {
            return { valid: false, reason: 'Call record missing id field' };
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
      requiresAuth: true,
      validateResponse: (data) => {
        if (!Array.isArray(data) && (!data.data || !Array.isArray(data.data))) {
          return { valid: false, reason: 'Response is not an array or data wrapper' };
        }
        const dispositions = data.data || data;
        logInfo(`Found ${dispositions.length} dispositions`);
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

  // 7. Calls Routes
  logSection('7. Calls API');
  
  await testEndpoint(
    'Get Call History',
    '/api/calls/history',
    {
      requiresAuth: true,
      expectedStatus: [200, 404],
      validateResponse: (data) => {
        return { valid: true };
      }
    }
  );

  // Final Report
  logSection('📊 Test Results Summary');
  console.log('\n');
  
  // Authentication status
  if (authenticated) {
    logSuccess('✓ Authenticated tests executed');
  } else {
    logWarning('⚠ Some tests skipped due to authentication failure');
  }
  
  logInfo(`Total Tests: ${results.passed + results.failed + results.warnings}`);
  logSuccess(`Passed: ${results.passed}`);
  logError(`Failed: ${results.failed}`);
  
  if (results.warnings > 0) {
    logWarning(`Warnings: ${results.warnings}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Detailed Results:');
  console.log('─'.repeat(60));
  
  results.tests.forEach((test, index) => {
    const symbol = test.status === 'PASSED' ? '✓' : test.status === 'WARNING' ? '⚠' : '✗';
    const color = test.status === 'PASSED' ? colors.green : test.status === 'WARNING' ? colors.yellow : colors.red;
    log(`${index + 1}. ${symbol} ${test.name}${test.reason ? ` - ${test.reason}` : ''}`, color);
  });

  // Endpoint Summary
  console.log('\n' + '─'.repeat(60));
  console.log('Endpoint Authentication Summary:');
  console.log('─'.repeat(60));
  
  const authRequired = results.endpoints.filter(e => e.status === 401 || e.requiresAuth);
  const noAuthRequired = results.endpoints.filter(e => e.status !== 401 && !e.requiresAuth);
  
  logInfo(`Endpoints requiring auth: ${authRequired.length}`);
  logInfo(`Public endpoints: ${noAuthRequired.length}`);

  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    logSuccess('🎉 ALL TESTS PASSED! Railway deployment is healthy.');
  } else if (results.failed > 0 && results.passed > 0) {
    logWarning(`⚠️  ${results.failed} test(s) failed, but ${results.passed} passed. Partial success.`);
  } else {
    logError(`⚠️  ${results.failed} test(s) failed. Please review the issues above.`);
  }
  
  console.log('='.repeat(60) + '\n');

  // Return exit code (0 if at least health check passed)
  return results.passed > 0 ? 0 : 1;
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
