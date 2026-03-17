/**
 * Comprehensive Disposition-Campaign Linking Script
 * Ensures all dispositions have proper IDs and are linked to all campaigns
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

// Default disposition configurations
const defaultDispositions = [
  // Positive Outcomes
  { name: 'Sale Made', description: 'Successful sale completed', category: 'positive', retryEligible: false },
  { name: 'Appointment Booked', description: 'Meeting or appointment scheduled', category: 'positive', retryEligible: false },
  { name: 'Interest Shown', description: 'Customer expressed interest', category: 'positive', retryEligible: true, retryDelay: 7 },
  { name: 'Information Sent', description: 'Information provided to customer', category: 'positive', retryEligible: true, retryDelay: 14 },
  { name: 'Connected', description: 'Successfully connected with customer', category: 'positive', retryEligible: false },
  
  // Neutral Outcomes
  { name: 'Call Back - CALL ME', description: 'Customer requested callback', category: 'neutral', retryEligible: true, retryDelay: 1 },
  { name: 'Callback Requested', description: 'Agent to call back later', category: 'neutral', retryEligible: true, retryDelay: 3 },
  { name: 'No Answer', description: 'Phone rang but no answer', category: 'neutral', retryEligible: true, retryDelay: 1 },
  { name: 'Busy', description: 'Line was busy', category: 'neutral', retryEligible: true, retryDelay: 1 },
  { name: 'Answering Machine', description: 'Reached answering machine', category: 'neutral', retryEligible: true, retryDelay: 2 },
  { name: 'Voicemail Left', description: 'Left message on voicemail', category: 'neutral', retryEligible: true, retryDelay: 3 },
  { name: 'Disconnected', description: 'Call was disconnected', category: 'neutral', retryEligible: true, retryDelay: 1 },
  
  // Negative Outcomes
  { name: 'Not Interested - NI', description: 'Customer not interested', category: 'negative', retryEligible: false },
  { name: 'Do Not Call', description: 'Customer requested no more calls', category: 'negative', retryEligible: false },
  { name: 'Wrong Number', description: 'Incorrect phone number', category: 'negative', retryEligible: false },
  { name: 'Hostile/Rude', description: 'Customer was hostile or rude', category: 'negative', retryEligible: false },
  { name: 'Deceased', description: 'Contact is deceased', category: 'negative', retryEligible: false },
  { name: 'Cancelled', description: 'Appointment or service cancelled', category: 'negative', retryEligible: false }
];

async function ensureDispositionsAndCampaignLinks() {
  console.log('🚀 Starting comprehensive disposition and campaign linking process...\n');
  
  try {
    // Step 1: Get all campaigns
    console.log('📋 Step 1: Fetching all campaigns...');
    const allCampaigns = await prisma.campaign.findMany({
      select: { 
        campaignId: true, 
        name: true, 
        isActive: true
      }
    });
    
    console.log(`   Found ${allCampaigns.length} campaigns:`);
    allCampaigns.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.campaignId} (${c.name}) - ${c.isActive ? 'Active' : 'Inactive'}`);
    });
    
    // Step 2: Ensure all default dispositions exist
    console.log('\n📋 Step 2: Ensuring all default dispositions exist...');
    const createdDispositions = [];
    
    for (const dispConfig of defaultDispositions) {
      try {
        const existingDisposition = await prisma.disposition.findFirst({
          where: { name: dispConfig.name }
        });
        
        if (!existingDisposition) {
          const newDisposition = await prisma.disposition.create({
            data: {
              name: dispConfig.name,
              description: dispConfig.description,
              category: dispConfig.category,
              isActive: true,
              retryEligible: dispConfig.retryEligible,
              retryDelay: dispConfig.retryDelay
            }
          });
          createdDispositions.push(newDisposition);
          console.log(`   ✅ Created: ${newDisposition.name} (${newDisposition.id})`);
        } else {
          console.log(`   ✅ Exists: ${existingDisposition.name} (${existingDisposition.id})`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to create ${dispConfig.name}: ${error.message}`);
      }
    }
    
    // Step 3: Get all dispositions
    console.log('\n📋 Step 3: Fetching all dispositions...');
    const allDispositions = await prisma.disposition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true }
    });
    
    console.log(`   Found ${allDispositions.length} active dispositions:`);
    allDispositions.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name} (${d.id}) - ${d.category}`);
    });
    
    // Step 4: Create campaign-disposition links for all combinations
    console.log('\n📋 Step 4: Creating campaign-disposition links...');
    const linkResults = {
      created: 0,
      existing: 0,
      errors: 0
    };
    
    for (const campaign of allCampaigns) {
      console.log(`\n   🎯 Processing campaign: ${campaign.name} (${campaign.campaignId})`);
      
      for (const disposition of allDispositions) {
        try {
          const existingLink = await prisma.campaignDisposition.findUnique({
            where: {
              campaignId_dispositionId: {
                campaignId: campaign.campaignId,
                dispositionId: disposition.id
              }
            }
          });
          
          if (!existingLink) {
            await prisma.campaignDisposition.create({
              data: {
                campaignId: campaign.campaignId,
                dispositionId: disposition.id,
                isRequired: false,
                sortOrder: allDispositions.indexOf(disposition) + 1
              }
            });
            linkResults.created++;
            console.log(`      ✅ Linked: ${disposition.name}`);
          } else {
            linkResults.existing++;
            console.log(`      ✅ Already linked: ${disposition.name}`);
          }
        } catch (linkError) {
          linkResults.errors++;
          console.log(`      ❌ Failed to link ${disposition.name}: ${linkError.message}`);
        }
      }
    }
    
    // Step 5: Verify campaign disposition counts
    console.log('\n📋 Step 5: Verification - Campaign disposition counts...');
    for (const campaign of allCampaigns) {
      const dispositionCount = await prisma.campaignDisposition.count({
        where: { campaignId: campaign.campaignId }
      });
      
      console.log(`   ${campaign.name}: ${dispositionCount} dispositions linked`);
      
      if (dispositionCount !== allDispositions.length) {
        console.log(`      ⚠️  Expected ${allDispositions.length}, got ${dispositionCount}`);
      }
    }
    
    // Step 6: Test disposition availability for manual-dial campaign
    console.log('\n📋 Step 6: Testing manual-dial campaign dispositions...');
    const manualDialDispositions = await prisma.campaignDisposition.findMany({
      where: { campaignId: 'manual-dial' },
      include: { 
        disposition: { select: { id: true, name: true, category: true } },
        campaign: { select: { campaignId: true, name: true } }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`   Manual-dial campaign has ${manualDialDispositions.length} linked dispositions:`);
    manualDialDispositions.forEach((link, i) => {
      console.log(`   ${i + 1}. ${link.disposition.name} (${link.disposition.id}) - ${link.disposition.category}`);
    });
    
    // Step 7: Summary
    console.log('\n🎉 PROCESS COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   Total Campaigns: ${allCampaigns.length}`);
    console.log(`   Total Dispositions: ${allDispositions.length}`);
    console.log(`   New Dispositions Created: ${createdDispositions.length}`);
    console.log(`   Campaign Links Created: ${linkResults.created}`);
    console.log(`   Campaign Links Existing: ${linkResults.existing}`);
    console.log(`   Link Errors: ${linkResults.errors}`);
    console.log(`   Expected Total Links: ${allCampaigns.length * allDispositions.length}`);
    console.log(`   Actual Total Links: ${linkResults.created + linkResults.existing}`);
    
    if (linkResults.created + linkResults.existing === allCampaigns.length * allDispositions.length) {
      console.log('\n✅ SUCCESS: All dispositions are properly linked to all campaigns!');
      console.log('📞 Call disposition saving should now work perfectly for all campaigns.');
    } else {
      console.log('\n⚠️  WARNING: Some links may be missing. Check the errors above.');
    }
    
  } catch (error) {
    console.error('\n❌ Process failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the process
ensureDispositionsAndCampaignLinks().catch(console.error);