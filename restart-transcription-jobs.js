#!/usr/bin/env node

/**
 * Restart Transcription Jobs for Calls with Recording URLs
 * This script updates recording URLs and restarts failed transcription jobs
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function restartTranscriptionJobs() {
    try {
        console.log('🔄 Starting transcription job restart process...');

        // Step 1: Get calls that need transcription restart
        const callsNeedingRestart = await prisma.call.findMany({
            where: {
                OR: [
                    {
                        transcriptionJobs: {
                            some: {
                                status: 'retrying'
                            }
                        }
                    },
                    {
                        transcriptionJobs: {
                            some: {
                                status: 'failed'
                            }
                        }
                    }
                ]
            },
            include: {
                recordingFiles: true,
                transcriptionJobs: true
            }
        });

        console.log(`📊 Found ${callsNeedingRestart.length} calls needing transcription restart`);

        for (const call of callsNeedingRestart) {
            console.log(`\n🔧 Processing call ${call.id} (SID: ${call.twilioSid})`);

            // Check if recording file has URL
            const recordingFile = call.recordingFiles[0];
            if (!recordingFile) {
                console.log(`❌ No recording file found for call ${call.id}`);
                continue;
            }

            if (!recordingFile.url) {
                console.log(`⚠️  Recording file ${recordingFile.id} missing URL, skipping...`);
                continue;
            }

            // Update transcription jobs to pending status
            const updatedJobs = await prisma.transcriptionJob.updateMany({
                where: {
                    callId: call.id,
                    status: {
                        in: ['retrying', 'failed', 'error']
                    }
                },
                data: {
                    status: 'pending',
                    error: null,
                    updatedAt: new Date()
                }
            });

            if (updatedJobs.count > 0) {
                console.log(`✅ Restarted ${updatedJobs.count} transcription job(s) for call ${call.id}`);
            }

            // Also ensure recording file status is correct
            await prisma.recordingFile.update({
                where: { id: recordingFile.id },
                data: {
                    status: 'completed',
                    updatedAt: new Date()
                }
            });
        }

        // Step 2: Summary of current state
        const pendingJobs = await prisma.transcriptionJob.count({
            where: { status: 'pending' }
        });

        const retryingJobs = await prisma.transcriptionJob.count({
            where: { status: 'retrying' }
        });

        const completedJobs = await prisma.transcriptionJob.count({
            where: { status: 'completed' }
        });

        console.log('\n📈 Transcription Job Status Summary:');
        console.log(`   • Pending: ${pendingJobs}`);
        console.log(`   • Retrying: ${retryingJobs}`);
        console.log(`   • Completed: ${completedJobs}`);

        console.log('\n✅ Transcription job restart process completed successfully!');

    } catch (error) {
        console.error('❌ Error restarting transcription jobs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
restartTranscriptionJobs();