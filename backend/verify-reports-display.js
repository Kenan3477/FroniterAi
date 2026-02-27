/**
 * Verify reports display after campaign assignment fixes
 * Check if the reports page now shows correct campaign names
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

// Use production database URL for this verification
process.env.DATABASE_URL = 'postgresql://postgres:fUacRWovhQIcJLPmJJnCcIZVxMIgKoLJ@postgres.railway.internal:5432/railway';

const prisma = new PrismaClient();

async function verifyReportsDisplay() {
    console.log('\n🔍 VERIFYING REPORTS DISPLAY AFTER CAMPAIGN FIXES\n');
    
    try {
        // 1. Check current call records with campaign information
        console.log('📊 Checking call records with campaign details...');
        const callRecords = await prisma.callRecord.findMany({
            include: {
                campaign: true,
                agent: true
            },
            orderBy: {
                callDate: 'desc'
            },
            take: 20
        });
        
        console.log(`Found ${callRecords.length} recent call records:\n`);
        
        for (const call of callRecords) {
            const campaignName = call.campaign ? call.campaign.name : 'CAMPAIGN NOT FOUND';
            const agentName = call.agent ? call.agent.firstName : 'AGENT NOT FOUND';
            const hasRecording = call.recording ? '✅' : '❌';
            
            console.log(`Call ID: ${call.id}`);
            console.log(`  Campaign: ${campaignName} (ID: ${call.campaignId})`);
            console.log(`  Agent: ${agentName}`);
            console.log(`  Recording: ${hasRecording} ${call.recording || 'No recording URL'}`);
            console.log(`  Date: ${call.callDate}`);
            console.log(`  Disposition: ${call.disposition || 'No disposition'}`);
            console.log('');
        }
        
        // 2. Check campaign statistics
        console.log('📈 Campaign call distribution:');
        const campaignStats = await prisma.callRecord.groupBy({
            by: ['campaignId'],
            _count: {
                id: true
            }
        });
        
        for (const stat of campaignStats) {
            const campaign = await prisma.campaign.findUnique({
                where: { campaignId: stat.campaignId }
            });
            
            console.log(`Campaign "${campaign?.name || 'UNKNOWN'}" (${stat.campaignId}): ${stat._count.id} calls`);
        }
        
        // 3. Check for any orphaned calls (calls without valid campaign)
        console.log('\n🔍 Checking for orphaned calls...');
        const orphanedCalls = await prisma.callRecord.findMany({
            where: {
                campaign: null
            }
        });
        
        if (orphanedCalls.length > 0) {
            console.log(`⚠️  Found ${orphanedCalls.length} orphaned calls:`);
            for (const call of orphanedCalls) {
                console.log(`  Call ID: ${call.id}, Campaign ID: ${call.campaignId}`);
            }
        } else {
            console.log('✅ No orphaned calls found');
        }
        
        // 4. Recording status summary
        console.log('\n🎥 Recording status summary:');
        const recordingStats = await prisma.callRecord.groupBy({
            by: [],
            _count: {
                id: true
            },
            where: {
                recording: {
                    not: null
                }
            }
        });
        
        const totalCalls = await prisma.callRecord.count();
        const callsWithRecordings = recordingStats[0]?._count.id || 0;
        const callsWithoutRecordings = totalCalls - callsWithRecordings;
        
        console.log(`Total calls: ${totalCalls}`);
        console.log(`Calls with recordings: ${callsWithRecordings}`);
        console.log(`Calls without recordings: ${callsWithoutRecordings}`);
        console.log(`Recording percentage: ${((callsWithRecordings / totalCalls) * 100).toFixed(1)}%`);
        
        // 5. Test backend reports API
        console.log('\n🌐 Testing backend reports API...');
        try {
            const response = await fetch('https://omnivox-backend-production.up.railway.app/api/reports/dashboard');
            if (response.ok) {
                const dashboardData = await response.json();
                console.log('✅ Backend reports API accessible');
                console.log(`Dashboard widgets: ${dashboardData.length || 'N/A'}`);
            } else {
                console.log(`❌ Backend reports API error: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Backend reports API connection error: ${error.message}`);
        }
        
        console.log('\n✅ VERIFICATION COMPLETE');
        
    } catch (error) {
        console.error('❌ Verification error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyReportsDisplay();