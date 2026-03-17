/**
 * Simple test of our campaign assignment fixes using direct database queries
 * This will run on our Railway backend to verify the fixes
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFixes() {
    console.log('\n✅ VERIFYING CAMPAIGN ASSIGNMENT FIXES\n');
    
    try {
        // Check total call count
        const totalCalls = await prisma.callRecord.count();
        console.log(`📞 Total calls in database: ${totalCalls}`);
        
        // Check campaign distribution
        console.log('\n📊 Campaign distribution:');
        const campaigns = await prisma.campaign.findMany({
            include: {
                _count: {
                    select: {
                        callRecords: true
                    }
                }
            }
        });
        
        for (const campaign of campaigns) {
            console.log(`  ${campaign.name} (${campaign.campaignId}): ${campaign._count.callRecords} calls`);
        }
        
        // Check for any calls with invalid campaign assignments
        console.log('\n🔍 Checking for invalid campaign assignments...');
        const invalidCalls = await prisma.callRecord.findMany({
            where: {
                campaign: null
            },
            select: {
                id: true,
                campaignId: true,
                callDate: true
            }
        });
        
        if (invalidCalls.length > 0) {
            console.log(`⚠️  Found ${invalidCalls.length} calls with invalid campaign assignments:`);
            for (const call of invalidCalls.slice(0, 5)) {
                console.log(`    Call ${call.id}: Campaign ID "${call.campaignId}" (${call.callDate})`);
            }
        } else {
            console.log('✅ No invalid campaign assignments found');
        }
        
        // Check recording status
        console.log('\n🎥 Recording status:');
        const recordingStats = await prisma.callRecord.aggregate({
            _count: {
                id: true,
                recording: true
            }
        });
        
        const recordingPercentage = recordingStats._count.recording ? 
            ((recordingStats._count.recording / recordingStats._count.id) * 100).toFixed(1) : '0.0';
        
        console.log(`  Total calls: ${recordingStats._count.id}`);
        console.log(`  Calls with recordings: ${recordingStats._count.recording}`);
        console.log(`  Recording percentage: ${recordingPercentage}%`);
        
        // Show recent calls with campaign names
        console.log('\n📋 Recent calls with campaign information:');
        const recentCalls = await prisma.callRecord.findMany({
            include: {
                campaign: {
                    select: {
                        name: true,
                        campaignId: true
                    }
                },
                agent: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                callDate: 'desc'
            },
            take: 10
        });
        
        for (const call of recentCalls) {
            const campaignName = call.campaign ? call.campaign.name : 'NO CAMPAIGN';
            const agentName = call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : 'NO AGENT';
            const recording = call.recording ? '🎥' : '❌';
            
            console.log(`  ${call.callDate.toISOString().split('T')[0]} | ${campaignName} | ${agentName} | ${recording}`);
        }
        
        console.log('\n✅ VERIFICATION COMPLETE');
        console.log('\nSUMMARY:');
        console.log(`- Total calls: ${totalCalls}`);
        console.log(`- Invalid campaign assignments: ${invalidCalls.length}`);
        console.log(`- Recording percentage: ${recordingPercentage}%`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyFixes();