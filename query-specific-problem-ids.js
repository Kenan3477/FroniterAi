/**
 * Query the specific 7 call record IDs that the API shows as lacking recordings
 * This will definitively show if recordings exist at the database level
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const problemIds = [
  'cmm56k3d4000lbxrwfr9cvohy',
  'cmm50rdh4001311nuj1vpupkr',
  'cmm4nbteb000mzxo1z4yir43w',
  'cmm3vcwah000zho1r6i24vxnx',
  'cmm3odp85000br88qhp3lqe0h',
  'cmm3beu8d000jntct3d2oo6yt',
  'cmm3bcsr7000fntctfb9hda1l'
];

async function queryProblemRecords() {
  console.log('🔍 Querying the 7 specific problem call record IDs...\n');

  // Method 1: Use raw SQL
  console.log('📊 Method 1: Raw SQL LEFT JOIN\n');
  const rawResults = await prisma.$queryRaw`
    SELECT 
      cr.id,
      cr."callId",
      r.id as recording_id,
      r."callRecordId",
      r."fileName",
      r.duration
    FROM call_records cr
    LEFT JOIN recordings r ON cr.id = r."callRecordId"
    WHERE cr.id = ANY(${problemIds})
    ORDER BY cr."startTime" DESC
  `;
  
  console.log('Raw SQL Results:');
  rawResults.forEach((row, i) => {
    console.log(`\n${i + 1}. Call Record ID: ${row.id}`);
    console.log(`   Call ID: ${row.callId}`);
    console.log(`   Recording ID: ${row.recording_id || '❌ NULL'}`);
    console.log(`   Recording callRecordId: ${row.callRecordId || '❌ NULL'}`);
    console.log(`   Recording fileName: ${row.fileName || '❌ NULL'}`);
    console.log(`   Recording duration: ${row.duration || '❌ NULL'}`);
  });

  // Method 2: Use Prisma with include
  console.log('\n\n📊 Method 2: Prisma include\n');
  const prismaResults = await prisma.callRecord.findMany({
    where: {
      id: { in: problemIds }
    },
    include: {
      recordingFile: {
        select: {
          id: true,
          fileName: true,
          duration: true,
          uploadStatus: true,
          createdAt: true,
          callRecordId: true
        }
      }
    },
    orderBy: { startTime: 'desc' }
  });

  console.log('Prisma Results:');
  prismaResults.forEach((record, i) => {
    console.log(`\n${i + 1}. Call Record ID: ${record.id}`);
    console.log(`   Call ID: ${record.callId}`);
    console.log(`   Recording File: ${record.recordingFile ? '✅ EXISTS' : '❌ NULL'}`);
    if (record.recordingFile) {
      console.log(`   Recording ID: ${record.recordingFile.id}`);
      console.log(`   Recording callRecordId: ${record.recordingFile.callRecordId}`);
      console.log(`   Recording fileName: ${record.recordingFile.fileName}`);
      console.log(`   Recording duration: ${record.recordingFile.duration}`);
    }
  });

  // Summary
  console.log('\n\n📊 SUMMARY\n');
  const rawWithRecordings = rawResults.filter(r => r.recording_id !== null).length;
  const rawWithoutRecordings = rawResults.filter(r => r.recording_id === null).length;
  const prismaWithRecordings = prismaResults.filter(r => r.recordingFile !== null).length;
  const prismaWithoutRecordings = prismaResults.filter(r => r.recordingFile === null).length;

  console.log(`Raw SQL: ${rawWithRecordings} with recordings, ${rawWithoutRecordings} without`);
  console.log(`Prisma: ${prismaWithRecordings} with recordings, ${prismaWithoutRecordings} without`);

  if (rawWithoutRecordings > 0) {
    console.log('\n⚠️ FOUND ORPHANED RECORDS IN DATABASE!');
    console.log('These call records genuinely have no corresponding recordings table entry.');
  } else if (prismaWithoutRecordings > 0) {
    console.log('\n⚠️ PRISMA RELATION ISSUE!');
    console.log('Raw SQL shows recordings exist, but Prisma include returns null.');
    console.log('This suggests a foreign key mismatch or Prisma relation misconfiguration.');
  } else {
    console.log('\n✅ ALL RECORDS HAVE RECORDINGS!');
    console.log('The problem must be in the API endpoint response transformation.');
  }

  await prisma.$disconnect();
}

queryProblemRecords().catch(console.error);
