const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres:bRANCHsTOPsign@junction.proxy.rlwy.net:54654/railway"
});

async function checkCampaignDispositions() {
  console.log('🔍 Checking campaign disposition relationships...\n');
  
  try {
    // Check all campaign dispositions
    console.log('📋 All Campaign Dispositions:');
    const campaignDispositions = await prisma.campaignDisposition.findMany({
      include: {
        campaign: { select: { campaignId: true, name: true } },
        disposition: { select: { id: true, name: true } }
      }
    });
    
    console.log(`Found ${campaignDispositions.length} campaign disposition links:`);
    campaignDispositions.forEach(cd => {
      console.log(`  Campaign: ${cd.campaign.campaignId} (${cd.campaign.name})`);
      console.log(`  Disposition: ${cd.disposition.name} (${cd.disposition.id})`);
      console.log(`  Required: ${cd.isRequired}`);
      console.log('  ---');
    });
    
    // Check if manual-dial campaign has dispositions
    console.log('\n🎯 Manual-dial campaign dispositions:');
    const manualDialDispositions = campaignDispositions.filter(cd => cd.campaign.campaignId === 'manual-dial');
    
    if (manualDialDispositions.length === 0) {
      console.log('❌ NO DISPOSITIONS linked to manual-dial campaign!');
      console.log('   This explains why dispositionId stays null');
    } else {
      console.log(`✅ Found ${manualDialDispositions.length} dispositions for manual-dial:`);
      manualDialDispositions.forEach(cd => {
        console.log(`   - ${cd.disposition.name} (${cd.disposition.id})`);
      });
    }
    
    // Check if our target disposition exists
    const targetDisposition = 'cmm3dgmwi0002bk8br3qsinpd';
    console.log(`\n🎯 Checking if disposition ${targetDisposition} is linked to manual-dial:`);
    
    const hasTargetDisposition = manualDialDispositions.some(cd => cd.disposition.id === targetDisposition);
    
    if (hasTargetDisposition) {
      console.log('✅ Target disposition IS linked to manual-dial');
    } else {
      console.log('❌ Target disposition NOT linked to manual-dial');
      console.log('   Need to create CampaignDisposition link');
    }
    
  } catch (error) {
    console.error('❌ Error checking campaign dispositions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCampaignDispositions();