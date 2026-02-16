#!/usr/bin/env node

/**
 * Create a simple HTML file to test disposition saving from browser context
 */

const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Disposition Saving Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test-btn { 
            background: #007bff; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            margin: 5px; 
        }
        .result { 
            margin: 10px 0; 
            padding: 10px; 
            border-radius: 4px; 
        }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>🔧 Disposition Saving Test</h1>
    
    <p><strong>Instructions:</strong></p>
    <ol>
        <li>Open this file after logging into Omnivox</li>
        <li>Click "Test Disposition Saving"</li>
        <li>Check the result below</li>
    </ol>
    
    <button class="test-btn" onclick="testDispositionSaving()">
        Test Disposition Saving
    </button>
    
    <button class="test-btn" onclick="testRecording()">
        Test Call Recording
    </button>
    
    <div id="results"></div>
    
    <script>
        async function testDispositionSaving() {
            const resultDiv = document.getElementById('results');
            
            try {
                resultDiv.innerHTML = '<div>⏳ Testing disposition saving...</div>';
                
                const testData = {
                    phoneNumber: '+447700900123',
                    customerInfo: {
                        firstName: 'Test',
                        lastName: 'Customer',
                        phone: '+447700900123'
                    },
                    disposition: {
                        outcome: 'COMPLETED',
                        notes: 'Test disposition from browser'
                    },
                    callDuration: 45,
                    agentId: 'test-agent-browser',
                    campaignId: 'test-campaign'
                };
                
                const response = await fetch('/api/calls/save-call-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testData)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    resultDiv.innerHTML = \`
                        <div class="result success">
                            ✅ Success! Disposition saved<br>
                            Contact: \${result.contact?.contactId}<br>
                            Interaction: \${result.interaction?.id}
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="result error">
                            ❌ Failed: \${result.error}<br>
                            Details: \${result.details}
                        </div>
                    \`;
                }
                
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="result error">
                        ❌ Error: \${error.message}
                    </div>
                \`;
            }
        }
        
        async function testRecording() {
            const resultDiv = document.getElementById('results');
            
            try {
                resultDiv.innerHTML = '<div>⏳ Testing call recording...</div>';
                
                const testRecording = {
                    callSid: 'CA' + Date.now(),
                    recordingUrl: 'https://api.twilio.com/2010-04-01/Accounts/test/Recordings/test.wav',
                    agentId: 'test-agent-browser',
                    contactId: 'CONT-' + Date.now(),
                    duration: 45
                };
                
                const response = await fetch('/api/calls/save-recording', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testRecording)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    resultDiv.innerHTML = \`
                        <div class="result success">
                            ✅ Recording endpoint responding
                        </div>
                    \`;
                } else {
                    const errorText = await response.text();
                    resultDiv.innerHTML = \`
                        <div class="result error">
                            ❌ Recording failed: \${response.status}<br>
                            \${errorText}
                        </div>
                    \`;
                }
                
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="result error">
                        ❌ Recording error: \${error.message}
                    </div>
                \`;
            }
        }
    </script>
</body>
</html>
`;

console.log('📝 Creating disposition test page...');

require('fs').writeFileSync('disposition-test.html', testHTML);

console.log('✅ Test page created: disposition-test.html');
console.log('📋 Instructions:');
console.log('1. Open Omnivox in browser and log in');
console.log('2. Open disposition-test.html in the same browser');
console.log('3. Click test buttons to verify disposition saving');
