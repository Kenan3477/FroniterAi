/**
 * Fix script for call campaign and recording issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRecentCalls() {
  console.log('🔧 Fixing recent call campaign and recording issues...\n');

  try {
    // 1. Fix campaign assignments for calls that show as "manual-dial"
    console.log('1. Fixing campaign assignments...');
    
    const manualDialCalls = await prisma.callRecord.findMany({
      where: {
        campaignId: 'manual-dial',
        startTime: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      take: 50 // Limit to recent calls
    });

    console.log(`   Found ${manualDialCalls.length} calls with manual-dial campaign`);

    // Update these to DAC campaign
    if (manualDialCalls.length > 0) {
      const updateResult = await prisma.callRecord.updateMany({
        where: {
          campaignId: 'manual-dial',
          startTime: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        data: {
          campaignId: 'DAC'
        }
      });
      
      console.log(`   ✅ Updated ${updateResult.count} calls to DAC campaign`);
    }

    // 2. Ensure DAC campaign exists
    console.log('\n2. Ensuring DAC campaign exists...');
    
    const dacCampaign = await prisma.campaign.upsert({
      where: { campaignId: 'DAC' },
      update: {
        name: 'Dial a Contact Campaign',
        status: 'Active',
        isActive: true
      },
      create: {
        campaignId: 'DAC',
        name: 'Dial a Contact Campaign',
        dialMethod: 'Manual',
        status: 'Active',
        isActive: true,
        description: 'Dial a Contact Campaign for individual calls',
        recordCalls: true,
        allowTransfers: false
      }
    });
    
    console.log(`   ✅ DAC campaign ready: ${dacCampaign.name}`);

    // 3. Check for calls without recordings that should have them
    console.log('\n3. Checking for missing recordings...');
    
    const callsWithoutRecordings = await prisma.callRecord.findMany({
      where: {
        AND: [
          { recording: null },
          { duration: { gt: 5 } }, // Calls longer than 5 seconds
          { 
            startTime: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        ]
      },
      include: {
        recordingFile: true
      }
    });

    console.log(`   Found ${callsWithoutRecordings.length} calls missing recording URLs`);

    // 4. Try to link existing recording records to call records
    let fixedRecordings = 0;
    for (const call of callsWithoutRecordings) {
      if (call.recordingFile && call.recordingFile.uploadStatus === 'completed') {
        // Call has recording record but no URL in call record
        const recordingUrl = `${process.env.BASE_RECORDING_URL || 'https://froniterai-production.up.railway.app/api/recordings'}/${call.recordingFile.id}/download`;
        
        await prisma.callRecord.update({
          where: { id: call.id },
          data: { recording: recordingUrl }
        });
        
        fixedRecordings++;
        console.log(`   ✅ Fixed recording URL for call ${call.callId}`);
      }
    }
    
    if (fixedRecordings > 0) {
      console.log(`   ✅ Fixed ${fixedRecordings} recording URLs`);
    }

    // 5. Show summary of recent calls
    console.log('\n4. Summary of recent calls:');
    
    const recentCallsSummary = await prisma.callRecord.groupBy({
      by: ['campaignId'],
      where: {
        startTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    console.log('   Campaign distribution (last 24 hours):');
    recentCallsSummary.forEach(summary => {
      console.log(`     ${summary.campaignId}: ${summary._count.id} calls`);
    });

    // 6. Check recording statistics
    const recordingStats = await prisma.callRecord.findMany({
      where: {
        startTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        duration: { gt: 5 }
      },
      select: {
        id: true,
        callId: true,
        recording: true,
        duration: true
      }
    });

    const withRecordings = recordingStats.filter(call => call.recording).length;
    const totalCalls = recordingStats.length;
    
    console.log(`\n   Recording statistics (calls > 5s in last 24h):`);
    console.log(`     Total calls: ${totalCalls}`);
    console.log(`     With recordings: ${withRecordings}`);
    console.log(`     Missing recordings: ${totalCalls - withRecordings}`);
    console.log(`     Recording rate: ${totalCalls > 0 ? Math.round((withRecordings / totalCalls) * 100) : 0}%`);

    console.log('\n✅ Fix complete!');

  } catch (error) {
    console.error('❌ Error fixing calls:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
export { fixRecentCalls };

// Run if called directly (Node.js compatible check)
if (require.main === module) {
  fixRecentCalls();
}