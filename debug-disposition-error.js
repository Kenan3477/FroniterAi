#!/usr/bin/env node

/**
 * Debug Disposition Saving Error
 * This script will check what's causing the 500 error in save-call-data
 */

const { PrismaClient } = require('@prisma/client');

async function debugDisposition() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Debugging disposition saving error...\n');

    // Check if agents exist
    console.log('📋 Checking agents...');
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        agentId: true,
        firstName: true,
        lastName: true
      },
      take: 10
    });
    
    console.log(`Found ${agents.length} agents:`);
    agents.forEach(agent => {
      console.log(`  - ${agent.agentId}: ${agent.firstName} ${agent.lastName}`);
    });
    
    // Check if campaigns exist  
    console.log('\n📋 Checking campaigns...');
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        campaignId: true,
        name: true
      },
      take: 10
    });
    
    console.log(`Found ${campaigns.length} campaigns:`);
    campaigns.forEach(campaign => {
      console.log(`  - ${campaign.campaignId}: ${campaign.name}`);
    });

    // Check specific agent and campaign IDs used in the API
    console.log('\n🔍 Checking specific IDs used in API...');
    
    const agentBrowser = await prisma.agent.findFirst({
      where: { agentId: 'agent-browser' }
    });
    console.log('agent-browser exists:', !!agentBrowser);
    
    const systemAgent = await prisma.agent.findFirst({
      where: { agentId: 'system-agent' }
    });
    console.log('system-agent exists:', !!systemAgent);
    
    const manualDialCampaign = await prisma.campaign.findFirst({
      where: { campaignId: 'manual-dial' }
    });
    console.log('manual-dial campaign exists:', !!manualDialCampaign);

    // Check the contact list
    console.log('\n📋 Checking contact lists...');
    const lists = await prisma.contactList.findMany({
      select: {
        listId: true,
        name: true
      },
      take: 5
    });
    
    console.log(`Found ${lists.length} contact lists:`);
    lists.forEach(list => {
      console.log(`  - ${list.listId}: ${list.name}`);
    });
    
    const manualDialList = await prisma.contactList.findFirst({
      where: { listId: 'manual-dial-list' }
    });
    console.log('manual-dial-list exists:', !!manualDialList);

    // Test creating a contact with minimal required fields
    console.log('\n🧪 Testing contact creation...');
    try {
      const testContact = await prisma.contact.create({
        data: {
          contactId: `TEST-${Date.now()}`,
          listId: 'manual-dial-list',
          firstName: 'Test',
          lastName: 'Contact',
          phone: '+1234567890',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Test contact created successfully:', testContact.contactId);
      
      // Clean up test contact
      await prisma.contact.delete({
        where: { contactId: testContact.contactId }
      });
      console.log('🗑️ Test contact cleaned up');
      
    } catch (contactError) {
      console.error('❌ Contact creation failed:', contactError.message);
      console.error('❌ Detailed error:', contactError);
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugDisposition().catch(console.error);