// Quick test for landline detection and optimization verification
const fetch = require('node-fetch');

async function testLandlineOptimizations() {
    console.log('🏠 Testing Landline Call Optimizations...\n');
    
    const backendUrl = 'https://froniterai-production.up.railway.app';
    
    const testNumbers = [
        { number: '+441234567890', type: 'UK Landline', expected: 'landline' },
        { number: '+447714333569', type: 'UK Mobile', expected: 'mobile' },
        { number: '+12125551234', type: 'US Landline (NYC)', expected: 'landline' },
        { number: '+13105551234', type: 'US Mixed Area', expected: 'landline' },
        { number: '+33145551234', type: 'France Landline', expected: 'landline' },
    ];
    
    console.log('📊 Testing number type detection:');
    
    for (const test of testNumbers) {
        console.log(`\n📞 Testing: ${test.number} (${test.type})`);
        
        try {
            // Test the TwiML endpoint to see if it detects landline correctly
            const twimlResponse = await fetch(`${backendUrl}/api/calls/twiml-customer-to-agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `To=${encodeURIComponent(test.number)}&test=true`
            });
            
            if (twimlResponse.ok) {
                const twimlContent = await twimlResponse.text();
                
                // Check for landline optimization indicators in TwiML
                const hasExtendedTimeout = twimlContent.includes('timeout="90"');
                const hasUKRingtone = twimlContent.includes('ringTone="gb"');
                const hasMachineDetection = twimlContent.includes('machineDetection');
                const hasPause = twimlContent.includes('<Pause length="1"/>');
                
                console.log('   TwiML Analysis:');
                console.log(`   - Extended timeout (90s): ${hasExtendedTimeout ? '✅' : '❌'}`);
                console.log(`   - UK ringtone: ${hasUKRingtone ? '✅' : '❌'}`);
                console.log(`   - Machine detection: ${hasMachineDetection ? '✅' : '❌'}`);
                console.log(`   - Landline pause: ${hasPause ? '✅' : '❌'}`);
                
                // Determine if optimizations are applied correctly
                const isOptimizedForLandline = hasExtendedTimeout || hasMachineDetection || hasPause;
                const shouldBeOptimized = test.expected === 'landline';
                
                if (shouldBeOptimized && isOptimizedForLandline) {
                    console.log('   🏠 ✅ Landline optimizations correctly applied');
                } else if (!shouldBeOptimized && !isOptimizedForLandline) {
                    console.log('   📱 ✅ Mobile settings correctly applied');
                } else if (shouldBeOptimized && !isOptimizedForLandline) {
                    console.log('   ❌ Missing landline optimizations');
                } else {
                    console.log('   ⚠️  Unexpected optimization pattern');
                }
                
            } else {
                console.log(`   ❌ TwiML test failed: ${twimlResponse.status}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Test error: ${error.message}`);
        }
    }
    
    console.log('\n📋 What to expect when you make landline calls:');
    console.log('   1. 🔍 Look for "LANDLINE 🏠" detection in logs');
    console.log('   2. ⏰ Extended 90-second timeout vs 60s for mobiles');
    console.log('   3. 🤖 Machine detection for voicemail handling');
    console.log('   4. 🔊 UK ringtone and optimized connection timing');
    console.log('   5. 📊 Better success rate (targeting 8-9/10 vs current 3/10)');
    
    console.log('\n🚀 Optimizations deployed! Try making landline calls now...');
    console.log('   Expected improvement: Much more reliable connections');
    console.log('   Ring-out should be faster and more consistent');
    console.log('   Better handling of busy signals and voicemail');
}

testLandlineOptimizations().catch(console.error);