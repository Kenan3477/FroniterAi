// Check various possible frontend URLs
const fetch = require('node-fetch');

async function checkFrontendURLs() {
    const possibleUrls = [
        'https://omnivox-ai-frontend-production.up.railway.app',
        'https://web-production-ef93.up.railway.app',
        'https://frontend-production.up.railway.app',
        'https://kennex-frontend-production.up.railway.app'
    ];
    
    console.log('🔍 Checking possible frontend URLs...\n');
    
    for (const url of possibleUrls) {
        try {
            console.log(`Testing: ${url}`);
            const response = await fetch(`${url}/api/test`, { 
                timeout: 5000,
                redirect: 'manual'
            });
            console.log(`  Status: ${response.status}`);
            console.log(`  Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}`);
            
            if (response.status === 200) {
                const text = await response.text();
                console.log(`  Response: ${text.substring(0, 200)}...`);
                console.log(`  ✅ Working URL found!`);
                break;
            }
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        console.log('');
    }
}

checkFrontendURLs();