const axios = require('axios');

async function debugContactsStructure() {
    try {
        console.log('🔍 Debug: Understanding contacts API structure...\n');

        const API_BASE = 'https://froniterai-production.up.railway.app';
        
        const response = await axios.get(`${API_BASE}/api/contacts`, {
            params: { limit: 5 }
        });

        console.log('Response status:', response.status);
        console.log('Response data keys:', Object.keys(response.data));
        console.log('Full response structure:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

debugContactsStructure();