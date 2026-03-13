#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

async function diagnoseIssues() {
  console.log('🚨 OMNIVOX DIAGNOSTIC REPORT');
  console.log('============================\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Database Connection Test
    console.log('1️⃣ Database Connection Test');
    console.log('---------------------------');
    await prisma.$connect();
    console.log('✅ Database connection: SUCCESS\n');
    
    // 2. Call Records Check
    console.log('2️⃣ Call Records Analysis');
    console.log('------------------------');
    const totalCalls = await prisma.callRecord.count();
    console.log(`📞 Total calls in database: ${totalCalls}`);
    
    if (totalCalls > 0) {
      const recentCalls = await prisma.callRecord.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          callId: true,
          phoneNumber: true,
          dialedNumber: true,
          outcome: true,
          duration: true,
          recording: true,
          createdAt: true
        }
      });
      
      console.log('🎯 Recent calls:');
      recentCalls.forEach((call, index) => {
        console.log(`  ${index + 1}. ID: ${call.id}`);
        console.log(`     CallId: ${call.callId}`);
        console.log(`     Phone: ${call.phoneNumber} → Dialed: ${call.dialedNumber}`);
        console.log(`     Outcome: ${call.outcome}`);
        console.log(`     Duration: ${call.duration}s`);
        console.log(`     Recording: ${call.recording ? '✅ YES' : '❌ NO'}`);
        console.log(`     Created: ${call.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ No call records found');
    }
    
    // 3. Transcript Analysis
    console.log('3️⃣ Transcript Analysis');
    console.log('----------------------');
    
    let totalTranscripts = 0;
    try {
      totalTranscripts = await prisma.callTranscript.count();
      console.log(`📝 Total transcripts: ${totalTranscripts}`);
      
      if (totalTranscripts > 0) {
        const recentTranscripts = await prisma.callTranscript.findMany({
          take: 2,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            callId: true,
            transcriptText: true,
            sentimentScore: true,
            processingProvider: true,
            createdAt: true,
            structuredJson: true
          }
        });
        
        console.log('🎯 Recent transcripts:');
        recentTranscripts.forEach((transcript, index) => {
          console.log(`  ${index + 1}. Call ID: ${transcript.callId}`);
          console.log(`     Provider: ${transcript.processingProvider}`);
          console.log(`     Sentiment: ${transcript.sentimentScore}`);
          console.log(`     Text Length: ${transcript.transcriptText?.length || 0} chars`);
          console.log(`     Has Structured Data: ${transcript.structuredJson ? '✅ YES' : '❌ NO'}`);
          console.log(`     Created: ${transcript.createdAt}`);
          console.log('');
        });
      } else {
        console.log('❌ No transcripts found');
      }
    } catch (error) {
      console.log(`❌ Transcript table error: ${error.message}`);
    }
    
    // 4. Environment Variables Check
    console.log('4️⃣ Environment Variables');
    console.log('------------------------');
    console.log(`🔑 OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ SET' : '❌ MISSING'}`);
    console.log(`📞 TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ SET' : '❌ MISSING'}`);
    console.log(`🔐 TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ SET' : '❌ MISSING'}`);
    console.log(`🗄️ DATABASE_URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING'}\n`);
    
    // 5. Specific Call Check (the one we've been testing)
    console.log('5️⃣ Specific Call Check');
    console.log('----------------------');
    const testCallId = 'cmlp65bce000amhihg98wkc0e';
    
    try {
      const testCall = await prisma.callRecord.findUnique({
        where: { id: testCallId },
        include: {
          transcripts: true
        }
      });
      
      if (testCall) {
        console.log('✅ Test call found:');
        console.log(`   ID: ${testCall.id}`);
        console.log(`   CallId: ${testCall.callId}`);
        console.log(`   Outcome: ${testCall.outcome}`);
        console.log(`   Recording URL: ${testCall.recording ? 'Present' : 'Missing'}`);
        console.log(`   Has transcripts: ${testCall.transcripts?.length > 0 ? 'YES' : 'NO'}`);
        if (testCall.transcripts && testCall.transcripts.length > 0) {
          const transcript = testCall.transcripts[0];
          console.log(`   Transcript provider: ${transcript.processingProvider}`);
          console.log(`   Transcript length: ${transcript.transcriptText?.length || 0} chars`);
        }
      } else {
        console.log(`❌ Test call ${testCallId} not found`);
      }
    } catch (error) {
      console.log(`❌ Test call check error: ${error.message}`);
    }
    
    console.log('\n✅ DIAGNOSTIC COMPLETE');
    
  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseIssues().catch(console.error);