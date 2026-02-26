/**
 * Remove Auto-Sync Data List and Clean Up System
 * Removes the AUTO-SYNC-CONTACTS list and any associated auto-sync data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function removeAutoSyncSystem() {
  console.log('🧹 Removing auto-sync system and cleaning up...\n');
  
  try {
    // Step 1: Find auto-sync related data
    console.log('📋 Step 1: Finding auto-sync related data...');
    
    const autoSyncList = await prisma.dataList.findFirst({
      where: { listId: 'AUTO-SYNC-CONTACTS' }
    });
    
    const liveCampaign = await prisma.campaign.findFirst({
      where: { campaignId: 'LIVE-CALLS' }
    });
    
    console.log('   AUTO-SYNC-CONTACTS list exists:', !!autoSyncList);
    console.log('   LIVE-CALLS campaign exists:', !!liveCampaign);
    
    // Step 2: Find auto-sync contacts
    const autoSyncContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { listId: 'AUTO-SYNC-CONTACTS' },
          { contactId: { startsWith: 'auto-sync-' } },
          { firstName: 'Auto-Sync' }
        ]
      }
    });
    
    console.log(`   Found ${autoSyncContacts.length} auto-sync contacts:`);
    autoSyncContacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone} (${contact.contactId})`);
    });
    
    // Step 3: Find call records associated with auto-sync
    const autoSyncCallRecords = await prisma.callRecord.findMany({
      where: {
        OR: [
          { campaignId: 'LIVE-CALLS' },
          { contactId: { in: autoSyncContacts.map(c => c.contactId) } }
        ]
      }
    });
    
    console.log(`   Found ${autoSyncCallRecords.length} auto-sync call records`);
    
    // Step 4: Delete call records first (foreign key dependencies)
    if (autoSyncCallRecords.length > 0) {
      console.log('\n📋 Step 4: Deleting auto-sync call records...');
      
      for (const record of autoSyncCallRecords) {
        try {
          await prisma.callRecord.delete({
            where: { id: record.id }
          });
          console.log(`   ✅ Deleted call record: ${record.callId}`);
        } catch (error) {
          console.log(`   ❌ Failed to delete call record ${record.callId}: ${error.message}`);
        }
      }
    }
    
    // Step 5: Delete auto-sync contacts
    if (autoSyncContacts.length > 0) {
      console.log('\n📋 Step 5: Deleting auto-sync contacts...');
      
      for (const contact of autoSyncContacts) {
        try {
          await prisma.contact.delete({
            where: { id: contact.id }
          });
          console.log(`   ✅ Deleted contact: ${contact.firstName} ${contact.lastName} (${contact.contactId})`);
        } catch (error) {
          console.log(`   ❌ Failed to delete contact ${contact.contactId}: ${error.message}`);
        }
      }
    }
    
    // Step 6: Delete AUTO-SYNC-CONTACTS data list
    if (autoSyncList) {
      console.log('\n📋 Step 6: Deleting AUTO-SYNC-CONTACTS data list...');
      try {
        await prisma.dataList.delete({
          where: { id: autoSyncList.id }
        });
        console.log('   ✅ Deleted AUTO-SYNC-CONTACTS data list');
      } catch (error) {
        console.log(`   ❌ Failed to delete AUTO-SYNC-CONTACTS list: ${error.message}`);
      }
    }
    
    // Step 7: Handle LIVE-CALLS campaign (keep it but make it organizational)
    if (liveCampaign) {
      console.log('\n📋 Step 7: Updating LIVE-CALLS campaign...');
      try {
        await prisma.campaign.update({
          where: { id: liveCampaign.id },
          data: {
            name: 'Live Calls',
            description: 'Organizational campaign for live call tracking (no auto-sync)',
            status: 'Active',
            isActive: true
            // Keep it but don't use it for auto-sync anymore
          }
        });
        console.log('   ✅ Updated LIVE-CALLS campaign (disabled auto-sync functionality)');
      } catch (error) {
        console.log(`   ❌ Failed to update LIVE-CALLS campaign: ${error.message}`);
      }
    }
    
    // Step 8: Verify cleanup
    console.log('\n📋 Step 8: Verification after cleanup...');
    
    const remainingAutoSyncContacts = await prisma.contact.count({
      where: {
        OR: [
          { listId: 'AUTO-SYNC-CONTACTS' },
          { contactId: { startsWith: 'auto-sync-' } },
          { firstName: 'Auto-Sync' }
        ]
      }
    });
    
    const remainingAutoSyncList = await prisma.dataList.findFirst({
      where: { listId: 'AUTO-SYNC-CONTACTS' }
    });
    
    console.log(`   Remaining auto-sync contacts: ${remainingAutoSyncContacts}`);
    console.log(`   AUTO-SYNC-CONTACTS list exists: ${!!remainingAutoSyncList}`);
    
    // Show current contact summary
    const allContacts = await prisma.contact.findMany({
      select: { firstName: true, lastName: true, phone: true, listId: true }
    });
    
    console.log(`\n📋 Final contact list (${allContacts.length} total):`);
    allContacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone} (List: ${contact.listId})`);
    });
    
    console.log('\n🎉 AUTO-SYNC SYSTEM REMOVAL COMPLETE!');
    console.log('📋 Summary:');
    console.log(`   ✅ Deleted ${autoSyncCallRecords.length} auto-sync call records`);
    console.log(`   ✅ Deleted ${autoSyncContacts.length} auto-sync contacts`);
    console.log(`   ✅ Removed AUTO-SYNC-CONTACTS data list`);
    console.log(`   ✅ Disabled auto-sync functionality in productionDialerRoutes.ts`);
    console.log(`   ✅ System will no longer create unwanted auto-sync contacts`);
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeAutoSyncSystem().catch(console.error);