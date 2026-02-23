const fetch = require('node-fetch');

async function testLoginLogoutReports() {
  const backendUrl = 'http://localhost:3004'; // Backend port
  
  try {
    console.log('Testing login/logout reports API...');
    
    // Test report generation endpoint
    const response = await fetch(`${backendUrl}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: 'authentication',
        subcategory: 'loginlogout',
        dateRange: 'last7days'
      })
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    console.log('Response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ API Response Structure:');
      console.log('- metrics:', Array.isArray(data.metrics) ? `Array(${data.metrics.length})` : typeof data.metrics);
      console.log('- chartData:', Array.isArray(data.chartData) ? `Array(${data.chartData.length})` : typeof data.chartData);
      console.log('- tableData:', Array.isArray(data.tableData) ? `Array(${data.tableData.length})` : typeof data.tableData);
      
      if (data.error) {
        console.log('- error:', data.error);
      }
    } else {
      console.error('❌ API request failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLoginLogoutReports();