const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
});

async function testCategorizedInteractionsFromCallRecords() {
  console.log('🧪 Testing CallRecord categorization logic...');
  
  const filters = {
    agentId: '509',
    limit: 20
  };
  
  console.log('📋 Input filters:', JSON.stringify(filters, null, 2));
  
  const baseWhere = {};
  
  if (filters.agentId) {
    baseWhere.agentId = filters.agentId;
    console.log(`🔍 Filtering by agentId: ${filters.agentId}`);
  }
  if (filters.campaignId) baseWhere.campaignId = filters.campaignId;
  
  // Default to today's records if no date filter
  if (!filters.dateFrom && !filters.dateTo) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    baseWhere.createdAt = {
      gte: today,
      lt: tomorrow
    };
  }

  const limit = filters.limit || 50;
  
  console.log('📋 CallRecord query filters:', baseWhere);

  try {
    const callRecords = await prisma.callRecord.findMany({
      where: baseWhere,
      include: {
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2
    });

    console.log(`📊 Found ${callRecords.length} call records to categorize`);
    
    // Log some sample records for debugging
    if (callRecords.length > 0) {
      console.log('🎯 Sample CallRecord data:');
      console.log(JSON.stringify(callRecords.slice(0, 2).map(r => ({
        id: r.id,
        agentId: r.agentId,
        contactId: r.contactId,
        outcome: r.outcome,
        contact: r.contact,
        campaign: r.campaign
      })), null, 2));
    }

    // Transform and categorize
    const transformedRecords = callRecords.map(record => ({
      id: record.id || record.callId,
      agentId: record.agentId || 'unknown',
      agentName: record.agentId || 'Unknown Agent',
      contactId: record.contactId || 'unknown',
      contactName: record.contact ? 
        `${record.contact.firstName || ''} ${record.contact.lastName || ''}`.trim() || 
        record.contact.phone || 'Unknown' : 'Unknown',
      contactPhone: record.contact?.phone || 'Unknown',
      campaignId: record.campaignId || 'unknown', 
      campaignName: record.campaign?.name || 'Unknown Campaign',
      channel: 'call',
      outcome: record.outcome || 'pending',
      status: record.outcome ? 'outcomed' : 'pending',
      isDmc: false,
      isCallback: false,
      callbackScheduledFor: null,
      startedAt: record.createdAt,
      endedAt: null,
      notes: record.notes || '',
      dateTime: record.createdAt.toISOString(),
      duration: '0',
      customerName: record.contact ? 
        `${record.contact.firstName || ''} ${record.contact.lastName || ''}`.trim() || 
        record.contact.phone || 'Unknown' : 'Unknown',
      telephone: record.contact?.phone || 'Unknown'
    }));

    console.log('\n🔄 All transformed records with outcomes:');
    transformedRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, Outcome: "${record.outcome}", Contact: ${record.contactName}`);
    });

    // Categorize the records
    const outcomed = transformedRecords.filter(record => 
      record.outcome && 
      record.outcome !== 'pending' && 
      record.outcome !== '' &&
      !record.outcome.toLowerCase().includes('callback')
    ).slice(0, limit);
    
    console.log(`\n🎯 Outcomed categorization: Found ${outcomed.length} outcomed records`);
    if (outcomed.length > 0) {
      console.log('📋 Outcomed records:');
      outcomed.forEach((record, index) => {
        console.log(`${index + 1}. ${record.contactName} - "${record.outcome}" (${record.dateTime})`);
      });
    }
    
    if (transformedRecords.length > 0) {
      console.log('\n📊 All outcomes found:');
      const outcomes = transformedRecords.map(r => r.outcome);
      console.log(outcomes);
      
      console.log('\n📈 Outcome breakdown:');
      const outcomeCounts = {};
      outcomes.forEach(outcome => {
        outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
      });
      console.log(outcomeCounts);
    }

    const allocated = transformedRecords.filter(record => 
      !record.outcome || 
      record.outcome === 'pending' || 
      record.outcome === 'in-progress'
    ).slice(0, limit);

    const queued = [];
    const unallocated = [];

    const result = {
      queued,
      allocated,
      outcomed,
      unallocated,
      totals: {
        queued: queued.length,
        allocated: allocated.length, 
        outcomed: outcomed.length,
        unallocated: unallocated.length
      }
    };

    console.log('\n📊 Final categorization result:', result.totals);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in categorization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCategorizedInteractionsFromCallRecords();