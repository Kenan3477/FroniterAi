// Simple test for Advanced Audit API
const API_BASE = 'http://localhost:3004';

console.log('🚀 Testing Advanced Audit API...\n');

// Test 1: Health check
fetch(`${API_BASE}/health`)
  .then(response => response.json())
  .then(data => {
    console.log('✅ Health Check:', data.status);
    console.log('✅ Database:', data.database?.connected ? 'Connected' : 'Disconnected');
    return testTrackActivity();
  })
  .catch(error => console.error('❌ Health check failed:', error.message));

// Test 2: Track activity
function testTrackActivity() {
  console.log('\n🔍 Testing Activity Tracking...');
  
  return fetch(`${API_BASE}/api/admin/advanced-audit/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: 'test-org-001',
      sessionId: 'test-session-001',
      activityType: 'page_view',
      pagePath: '/test-dashboard',
      pageTitle: 'Test Dashboard'
    })
  })
  .then(async response => {
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Activity Tracking:', data.message);
    } else {
      const text = await response.text();
      console.log('❌ Activity Tracking Failed:', response.status, text);
    }
  })
  .catch(error => console.error('❌ Activity tracking error:', error.message));
}

console.log('⏳ Starting API tests...');