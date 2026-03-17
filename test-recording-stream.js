const fetch = require('node-fetch');

async function testRecordingStream() {
    try {
        console.log('🔍 Testing recording streaming endpoint...\n');

        // First, let's try to get a recording ID from our database
        const { PrismaClient } = require('@prisma/client');
        require('dotenv').config();
        
        const prisma = new PrismaClient();
        const recording = await prisma.recording.findFirst();
        
        if (!recording) {
            console.log('❌ No recordings found in database');
            return;
        }

        console.log(`✅ Found recording: ${recording.fileName} (ID: ${recording.id})`);
        
        // Try to get admin credentials for testing
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });

        console.log('Login status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Login successful:', loginData.success);
            
            if (loginData.token) {
                console.log('Token received, testing recording stream...');
                
                // Test the streaming endpoint
                const streamResponse = await fetch(`https://froniterai-production.up.railway.app/api/recordings/${recording.id}/stream`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${loginData.token}`
                    }
                });

                console.log('Stream endpoint status:', streamResponse.status);
                console.log('Content-Type:', streamResponse.headers.get('content-type'));
                
                if (streamResponse.ok) {
                    console.log('✅ Recording streaming endpoint is working!');
                    console.log('Content-Length:', streamResponse.headers.get('content-length'));
                } else {
                    const errorText = await streamResponse.text();
                    console.log('❌ Stream failed:', errorText);
                }
            }
        } else {
            console.log('❌ Login failed, testing without auth...');
            
            // Test endpoint without auth to see if it's accessible
            const streamResponse = await fetch(`https://froniterai-production.up.railway.app/api/recordings/${recording.id}/stream`);
            console.log('Stream endpoint status (no auth):', streamResponse.status);
            
            const errorText = await streamResponse.text();
            console.log('Response:', errorText);
        }
        
        await prisma.$disconnect();
        
    } catch (error) {
        console.error('Test Error:', error.message);
    }
}

testRecordingStream();