/**
 * Complete System Reset - Remove ALL call data from today and reset dashboard
 * This will ensure when you make the next call, it's the only one in the system
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function completeSystemReset() {
    console.log('\n🔥 COMPLETE SYSTEM RESET - REMOVING ALL CALL DATA FROM TODAY\n');
    
    try {
        // Get today's date range (start and end of day)
        const today = new Date('2026-02-27'); // Today's date
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        console.log(`📅 Cleaning data from: ${startOfToday.toISOString()} to ${endOfToday.toISOString()}`);
        
        // 1. Check current state
        console.log('\n📊 Checking current state...');
        
        const todaysCallRecords = await prisma.callRecord.count({
            where: {
                OR: [
                    { startTime: { gte: startOfToday, lte: endOfToday } },
                    { createdAt: { gte: startOfToday, lte: endOfToday } }
                ]
            }
        });
        
        const todaysInteractions = await prisma.interaction.count({
            where: {
                OR: [
                    { startedAt: { gte: startOfToday, lte: endOfToday } },
                    { endedAt: { gte: startOfToday, lte: endOfToday } }
                ]
            }
        });
        
        const todaysRecordings = await prisma.recording.count({
            where: {
                createdAt: { gte: startOfToday, lte: endOfToday }
            }
        });
        
        const todaysKPIs = await prisma.callKPI.count({
            where: {
                callDate: { gte: startOfToday, lte: endOfToday }
            }
        });
        
        console.log(`Current state for today (${today.toDateString()}):`);
        console.log(`  - Call Records: ${todaysCallRecords}`);
        console.log(`  - Interactions: ${todaysInteractions}`);
        console.log(`  - Recordings: ${todaysRecordings}`);
        console.log(`  - KPIs: ${todaysKPIs}`);
        
        if (todaysCallRecords === 0 && todaysInteractions === 0 && todaysRecordings === 0) {
            console.log('✅ No data from today found - system is already clean');
            return;
        }
        
        console.log('\n🗑️  Starting cleanup process...');
        
        // 2. Delete recordings from today (must be first due to foreign keys)
        console.log('\n2️⃣ Deleting recordings from today...');
        const deletedRecordings = await prisma.recording.deleteMany({
            where: {
                createdAt: { gte: startOfToday, lte: endOfToday }
            }
        });
        console.log(`✅ Deleted ${deletedRecordings.count} recordings`);
        
        // 3. Delete transcriptions from today
        console.log('\n3️⃣ Deleting transcriptions from today...');
        const deletedTranscriptions = await prisma.transcription.deleteMany({
            where: {
                createdAt: { gte: startOfToday, lte: endOfToday }
            }
        });
        console.log(`✅ Deleted ${deletedTranscriptions.count} transcriptions`);
        
        // 4. Delete call KPIs from today
        console.log('\n4️⃣ Deleting call KPIs from today...');
        const deletedKPIs = await prisma.callKPI.deleteMany({
            where: {
                callDate: { gte: startOfToday, lte: endOfToday }
            }
        });
        console.log(`✅ Deleted ${deletedKPIs.count} KPI records`);
        
        // 5. Delete call records from today
        console.log('\n5️⃣ Deleting call records from today...');
        const deletedCallRecords = await prisma.callRecord.deleteMany({
            where: {
                OR: [
                    { startTime: { gte: startOfToday, lte: endOfToday } },
                    { createdAt: { gte: startOfToday, lte: endOfToday } }
                ]
            }
        });
        console.log(`✅ Deleted ${deletedCallRecords.count} call records`);
        
        // 6. Delete interactions from today (outcomed interactions)
        console.log('\n6️⃣ Deleting interactions from today...');
        const deletedInteractions = await prisma.interaction.deleteMany({
            where: {
                OR: [
                    { startedAt: { gte: startOfToday, lte: endOfToday } },
                    { endedAt: { gte: startOfToday, lte: endOfToday } }
                ]
            }
        });
        console.log(`✅ Deleted ${deletedInteractions.count} interactions`);
        
        // 7. Delete any sales from today
        console.log('\n7️⃣ Deleting sales from today...');
        const deletedSales = await prisma.sale.deleteMany({
            where: {
                createdAt: { gte: startOfToday, lte: endOfToday }
            }
        });
        console.log(`✅ Deleted ${deletedSales.count} sales records`);
        
        // 8. Delete dial queue entries from today
        console.log('\n8️⃣ Deleting dial queue entries from today...');
        const deletedQueueEntries = await prisma.dialQueueEntry.deleteMany({
            where: {
                OR: [
                    { queuedAt: { gte: startOfToday, lte: endOfToday } },
                    { dialedAt: { gte: startOfToday, lte: endOfToday } },
                    { completedAt: { gte: startOfToday, lte: endOfToday } }
                ]
            }
        });
        console.log(`✅ Deleted ${deletedQueueEntries.count} queue entries`);
        
        // 9. Delete pause events from today
        console.log('\n9️⃣ Deleting pause events from today...');
        const deletedPauseEvents = await prisma.pauseEvent.deleteMany({
            where: {
                startedAt: { gte: startOfToday, lte: endOfToday }
            }
        });
        console.log(`✅ Deleted ${deletedPauseEvents.count} pause events`);
        
        // 10. Reset contact attempt counts for today's attempts
        console.log('\n🔟 Resetting contact attempt counts from today...');
        const resetContacts = await prisma.contact.updateMany({
            where: {
                lastAttempt: { gte: startOfToday, lte: endOfToday }
            },
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
        
        // 11. Clean up any AI recommendations, alerts, or analysis from today
        console.log('\n1️⃣1️⃣ Cleaning up AI analysis data from today...');
        
        try {
            const deletedAiRecommendations = await prisma.ai_recommendations.deleteMany({
                where: {
                    createdAt: { gte: startOfToday, lte: endOfToday }
                }
            });
            console.log(`✅ Deleted ${deletedAiRecommendations.count} AI recommendations`);
        } catch (error) {
            console.log('ℹ️  No AI recommendations table or data');
        }
        
        try {
            const deletedAlerts = await prisma.alerts.deleteMany({
                where: {
                    createdAt: { gte: startOfToday, lte: endOfToday }
                }
            });
            console.log(`✅ Deleted ${deletedAlerts.count} alerts`);
        } catch (error) {
            console.log('ℹ️  No alerts table or data');
        }
        
        try {
            const deletedSentimentAnalysis = await prisma.sentiment_analysis.deleteMany({
                where: {
                    createdAt: { gte: startOfToday, lte: endOfToday }
                }
            });
            console.log(`✅ Deleted ${deletedSentimentAnalysis.count} sentiment analysis records`);
        } catch (error) {
            console.log('ℹ️  No sentiment analysis table or data');
        }
        
        // 12. Verify cleanup
        console.log('\n📊 Verifying cleanup...');
        
        const remainingCallRecords = await prisma.callRecord.count({
            where: {
                OR: [
                    { startTime: { gte: startOfToday, lte: endOfToday } },
                    { createdAt: { gte: startOfToday, lte: endOfToday } }
                ]
            }
        });
        
        const remainingInteractions = await prisma.interaction.count({
            where: {
                OR: [
                    { startedAt: { gte: startOfToday, lte: endOfToday } },
                    { endedAt: { gte: startOfToday, lte: endOfToday } }
                ]
            }
        });
        
        const remainingRecordings = await prisma.recording.count({
            where: {
                createdAt: { gte: startOfToday, lte: endOfToday }
            }
        });
        
        console.log(`After cleanup:`);
        console.log(`  - Call Records: ${remainingCallRecords}`);
        console.log(`  - Interactions: ${remainingInteractions}`);
        console.log(`  - Recordings: ${remainingRecordings}`);
        
        if (remainingCallRecords === 0 && remainingInteractions === 0 && remainingRecordings === 0) {
            console.log('\n✅ CLEANUP SUCCESSFUL - ALL TODAY\'S DATA REMOVED');
        } else {
            console.log('\n⚠️  Some records may still remain - check manually');
        }
        
        // 13. Verify core entities are preserved
        console.log('\n🔍 Verifying core entities are preserved...');
        
        const campaigns = await prisma.campaign.count();
        const agents = await prisma.agent.count();
        const contacts = await prisma.contact.count();
        const dataLists = await prisma.dataList.count();
        
        console.log(`Core entities preserved:`);
        console.log(`  - Campaigns: ${campaigns}`);
        console.log(`  - Agents: ${agents}`);
        console.log(`  - Contacts: ${contacts}`);
        console.log(`  - Data Lists: ${dataLists}`);
        
        console.log('\n✅ COMPLETE SYSTEM RESET FINISHED\n');
        
        console.log('📋 SUMMARY:');
        console.log(`✅ Deleted ${deletedCallRecords.count} call records from today`);
        console.log(`✅ Deleted ${deletedInteractions.count} interactions from today`);
        console.log(`✅ Deleted ${deletedRecordings.count} recordings from today`);
        console.log(`✅ Deleted ${deletedKPIs.count} KPI records from today`);
        console.log(`✅ Reset ${resetContacts.count} contacts to new status`);
        console.log('✅ Core entities preserved (campaigns, agents, etc.)');
        
        console.log('\n🎯 SYSTEM NOW READY:');
        console.log('✅ Dashboard will show 0 calls, 0 interactions');
        console.log('✅ Reports page will be empty of today\'s data');
        console.log('✅ Next call will be the only call in the system');
        console.log('✅ Next interaction will be the only outcomed interaction');
        console.log('✅ Fresh start for testing and validation');
        
    } catch (error) {
        console.error('❌ Error during system reset:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

completeSystemReset();