const testDirectRoute = async () => {
  console.log('🧪 Testing different routes...');
  
  try {
    // Test health endpoint first
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch('https://omnivox-backend-production.up.railway.app/health');
    console.log(`Health Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health Data:', JSON.stringify(healthData, null, 2));
    } else {
      const errorText = await healthResponse.text();
      console.log('Health Error:', errorText);
    }

    // Test root endpoint
    console.log('\n2. Testing root endpoint...');
    const rootResponse = await fetch('https://omnivox-backend-production.up.railway.app/');
    console.log(`Root Status: ${rootResponse.status}`);
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      console.log('Root Data:', JSON.stringify(rootData, null, 2));
    } else {
      const errorText = await rootResponse.text();
      console.log('Root Error:', errorText);
    }

  } catch (error) {
    console.error('💥 Error testing routes:', error);
  }
};

testDirectRoute();