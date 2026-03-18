// Test script to verify Advanced Audit API endpoints are working
const API_BASE = 'http://localhost:3004';

// Test data
const testOrganizationId = 'test-org-001';
const testUserId = 1;

async function testAdvancedAuditEndpoints() {
  console.log('🚀 Testing Advanced Audit API Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('   ✅ Health Check:', healthData.status);

    // Test 2: Track user activity (no auth needed for testing)
    console.log('\n2. Testing Activity Tracking...');
    const trackResponse = await fetch(`${API_BASE}/api/admin/advanced-audit/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationId: testOrganizationId,
        sessionId: 'test-session-001',
        activityType: 'page_view',
        pagePath: '/test-dashboard',
        pageTitle: 'Test Dashboard',
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (trackResponse.ok) {
      const trackData = await trackResponse.json();
      console.log('   ✅ Activity Tracking:', trackData.message);
    } else {
      console.log('   ❌ Activity Tracking Failed:', trackResponse.status, await trackResponse.text());
    }

    // Test 3: Get organization activities (this will need auth in real usage)
    console.log('\n3. Testing Get Organization Activities...');
    const activitiesResponse = await fetch(`${API_BASE}/api/admin/advanced-audit/organization/${testOrganizationId}/activities`);
    
    if (activitiesResponse.ok) {
      const activitiesData = await activitiesResponse.json();
      console.log('   ✅ Get Activities:', `Found ${activitiesData.data?.activities?.length || 0} activities`);
    } else {
      console.log('   ⚠️  Get Activities (Expected auth error):', activitiesResponse.status);
    }

    // Test 4: Get suspicious alerts
    console.log('\n4. Testing Get Suspicious Alerts...');
    const alertsResponse = await fetch(`${API_BASE}/api/admin/advanced-audit/organization/${testOrganizationId}/alerts`);
    
    if (alertsResponse.ok) {
      const alertsData = await alertsResponse.json();
      console.log('   ✅ Get Alerts:', `Found ${alertsData.data?.length || 0} alerts`);
    } else {
      console.log('   ⚠️  Get Alerts (Expected auth error):', alertsResponse.status);
    }

    // Test 5: Get user analytics
    console.log('\n5. Testing Get User Analytics...');
    const analyticsResponse = await fetch(`${API_BASE}/api/admin/advanced-audit/organization/${testOrganizationId}/analytics`);
    
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('   ✅ Get Analytics:', `Found ${analyticsData.data?.length || 0} user analytics`);
    } else {
      console.log('   ⚠️  Get Analytics (Expected auth error):', analyticsResponse.status);
    }

    console.log('\n🎉 Advanced Audit API test completed!');
    console.log('   Note: Authentication errors are expected for protected endpoints in this basic test.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAdvancedAuditEndpoints();