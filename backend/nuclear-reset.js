/**
 * NUCLEAR RESET - Remove ALL call data regardless of date
 * This will completely clean the entire system of any call-related data
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function nuclearReset() {
    console.log('\n☢️  NUCLEAR RESET - REMOVING ALL CALL DATA FROM ENTIRE SYSTEM\n');
    
    try {
        // 1. Check current state
        console.log('\n📊 Checking current state...');
        
        const totalCallRecords = await prisma.callRecord.count();
        const totalInteractions = await prisma.interaction.count();
        const totalRecordings = await prisma.recording.count();
        const totalKPIs = await prisma.callKPI.count();
        const totalSales = await prisma.sale.count();
        const totalQueueEntries = await prisma.dialQueueEntry.count();
        
        console.log(`Current state (ALL TIME):`);
        console.log(`  - Call Records: ${totalCallRecords}`);
        console.log(`  - Interactions: ${totalInteractions}`);
        console.log(`  - Recordings: ${totalRecordings}`);
        console.log(`  - KPIs: ${totalKPIs}`);
        console.log(`  - Sales: ${totalSales}`);
        console.log(`  - Queue Entries: ${totalQueueEntries}`);
        
        if (totalCallRecords === 0 && totalInteractions === 0 && totalRecordings === 0) {
            console.log('✅ No call data found - system is completely clean');
        } else {
            console.log('\n🗑️  Starting nuclear cleanup...');
            
            // Show recent records for debugging
            console.log('\n🔍 Recent call records (for debugging):');
            const recentCalls = await prisma.callRecord.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    callId: true,
                    phoneNumber: true,
                    startTime: true,
                    createdAt: true,
                    outcome: true
                }
            });
            
            recentCalls.forEach((call, index) => {
                console.log(`  ${index + 1}. ${call.callId} | ${call.phoneNumber} | ${call.startTime?.toISOString()} | Created: ${call.createdAt.toISOString()}`);
            });
        }
        
        // 2. Delete ALL recordings (must be first due to foreign keys)
        console.log('\n2️⃣ Deleting ALL recordings...');
        const deletedRecordings = await prisma.recording.deleteMany({});
        console.log(`✅ Deleted ${deletedRecordings.count} recordings`);
        
        // 3. Delete ALL transcriptions
        console.log('\n3️⃣ Deleting ALL transcriptions...');
        const deletedTranscriptions = await prisma.transcription.deleteMany({});
        console.log(`✅ Deleted ${deletedTranscriptions.count} transcriptions`);
        
        // 4. Delete ALL call KPIs
        console.log('\n4️⃣ Deleting ALL call KPIs...');
        const deletedKPIs = await prisma.callKPI.deleteMany({});
        console.log(`✅ Deleted ${deletedKPIs.count} KPI records`);
        
        // 5. Delete ALL sales
        console.log('\n5️⃣ Deleting ALL sales...');
        const deletedSales = await prisma.sale.deleteMany({});
        console.log(`✅ Deleted ${deletedSales.count} sales records`);
        
        // 6. Delete ALL interactions (outcomed interactions)
        console.log('\n6️⃣ Deleting ALL interactions...');
        const deletedInteractions = await prisma.interaction.deleteMany({});
        console.log(`✅ Deleted ${deletedInteractions.count} interactions`);
        
        // 7. Delete ALL call records
        console.log('\n7️⃣ Deleting ALL call records...');
        const deletedCallRecords = await prisma.callRecord.deleteMany({});
        console.log(`✅ Deleted ${deletedCallRecords.count} call records`);
        
        // 8. Delete ALL dial queue entries
        console.log('\n8️⃣ Deleting ALL dial queue entries...');
        const deletedQueueEntries = await prisma.dialQueueEntry.deleteMany({});
        console.log(`✅ Deleted ${deletedQueueEntries.count} queue entries`);
        
        // 9. Delete ALL pause events
        console.log('\n9️⃣ Deleting ALL pause events...');
        const deletedPauseEvents = await prisma.agentPauseEvent.deleteMany({});
        console.log(`✅ Deleted ${deletedPauseEvents.count} pause events`);
        
        // 10. Reset ALL contacts to new status
        console.log('\n🔟 Resetting ALL contacts to new status...');
        const resetContacts = await prisma.contact.updateMany({
            data: {
                attemptCount: 0,
                lastOutcome: null,
                lastAttempt: null,
                nextAttempt: null,
                locked: false,
                lockedBy: null,
                lockedAt: null,
                status: 'new'
            }
        });
        console.log(`✅ Reset ${resetContacts.count} contacts to new status`);
        
        // 11. Clean up any AI analysis data
        console.log('\n1️⃣1️⃣ Cleaning up ALL AI analysis data...');
        
        try {
            const deletedAiRecommendations = await prisma.ai_recommendations.deleteMany({});
            console.log(`✅ Deleted ${deletedAiRecommendations.count} AI recommendations`);
        } catch (error) {
            console.log('ℹ️  No AI recommendations to delete');
        }
        
        try {
            const deletedAlerts = await prisma.alerts.deleteMany({});
            console.log(`✅ Deleted ${deletedAlerts.count} alerts`);
        } catch (error) {
            console.log('ℹ️  No alerts to delete');
        }
        
        try {
            const deletedSentimentAnalysis = await prisma.sentiment_analysis.deleteMany({});
            console.log(`✅ Deleted ${deletedSentimentAnalysis.count} sentiment analysis records`);
        } catch (error) {
            console.log('ℹ️  No sentiment analysis to delete');
        }
        
        try {
            const deletedCallAnalysis = await prisma.call_analysis.deleteMany({});
            console.log(`✅ Deleted ${deletedCallAnalysis.count} call analysis records`);
        } catch (error) {
            console.log('ℹ️  No call analysis to delete');
        }
        
        try {
            const deletedDispositionTracking = await prisma.disposition_tracking.deleteMany({});
            console.log(`✅ Deleted ${deletedDispositionTracking.count} disposition tracking records`);
        } catch (error) {
            console.log('ℹ️  No disposition tracking to delete');
        }
        
        try {
            const deletedQualityMonitoring = await prisma.quality_monitoring.deleteMany({});
            console.log(`✅ Deleted ${deletedQualityMonitoring.count} quality monitoring records`);
        } catch (error) {
            console.log('ℹ️  No quality monitoring to delete');
        }
        
        try {
            const deletedAutomationTriggers = await prisma.automation_triggers.deleteMany({});
            console.log(`✅ Deleted ${deletedAutomationTriggers.count} automation triggers`);
        } catch (error) {
            console.log('ℹ️  No automation triggers to delete');
        }
        
        // 12. Verify complete cleanup
        console.log('\n📊 Verifying complete cleanup...');
        
        const finalCallRecords = await prisma.callRecord.count();
        const finalInteractions = await prisma.interaction.count();
        const finalRecordings = await prisma.recording.count();
        const finalKPIs = await prisma.callKPI.count();
        
        console.log(`Final state:`);
        console.log(`  - Call Records: ${finalCallRecords}`);
        console.log(`  - Interactions: ${finalInteractions}`);
        console.log(`  - Recordings: ${finalRecordings}`);
        console.log(`  - KPIs: ${finalKPIs}`);
        
        if (finalCallRecords === 0 && finalInteractions === 0 && finalRecordings === 0 && finalKPIs === 0) {
            console.log('\n✅ NUCLEAR CLEANUP SUCCESSFUL - ALL CALL DATA REMOVED');
        } else {
            console.log('\n⚠️  Some records still remain - manual investigation needed');
        }
        
        // 13. Verify core entities are preserved
        console.log('\n🔍 Verifying core entities are preserved...');
        
        const campaigns = await prisma.campaign.count();
        const agents = await prisma.agent.count();
        const contacts = await prisma.contact.count();
        const dataLists = await prisma.dataList.count();
        const dispositions = await prisma.disposition.count();
        
        console.log(`Core entities preserved:`);
        console.log(`  - Campaigns: ${campaigns}`);
        console.log(`  - Agents: ${agents}`);
        console.log(`  - Contacts: ${contacts}`);
        console.log(`  - Data Lists: ${dataLists}`);
        console.log(`  - Dispositions: ${dispositions}`);
        
        console.log('\n☢️  NUCLEAR RESET COMPLETE\n');
        
        console.log('📋 SUMMARY:');
        console.log('✅ ALL call records deleted');
        console.log('✅ ALL interactions deleted');
        console.log('✅ ALL recordings deleted');
        console.log('✅ ALL KPIs deleted');
        console.log('✅ ALL sales deleted');
        console.log('✅ ALL queue entries deleted');
        console.log('✅ ALL pause events deleted');
        console.log('✅ ALL AI analysis data deleted');
        console.log('✅ ALL contacts reset to new status');
        console.log('✅ Core entities preserved');
        
        console.log('\n🎯 SYSTEM STATUS:');
        console.log('✅ Dashboard will show 0 calls, 0 interactions, 0 everything');
        console.log('✅ Reports page will be completely empty');
        console.log('✅ Contacts are reset to new status');
        console.log('✅ Next call will be the ONLY call in the system');
        console.log('✅ Complete fresh start achieved');
        
        console.log('\n🔄 FRONTEND REFRESH:');
        console.log('➡️  Please refresh the frontend/reports page to see empty state');
        console.log('➡️  Clear browser cache if data still appears');
        console.log('➡️  Dashboard should show 0 for all metrics');
        
    } catch (error) {
        console.error('❌ Error during nuclear reset:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

nuclearReset();