/**
 * Default Disposition Setup Service
 * Creates the standard call dispositions matching the UI design
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const defaultDispositions = {
  negative: [
    { name: 'Cancelled', category: 'negative', retryEligible: false, description: 'Customer cancelled service/product' },
    { name: 'Do Not Call', category: 'negative', retryEligible: false, description: 'Customer requested not to be called again' },
    { name: 'Not Cover And Not Interested', category: 'negative', retryEligible: false, description: 'Not covered and no interest' },
    { name: 'Not Interested - NI', category: 'negative', retryEligible: false, description: 'Customer not interested' },
    { name: 'Wrong Number', category: 'negative', retryEligible: false, description: 'Incorrect phone number' },
    { name: 'Deceased', category: 'negative', retryEligible: false, description: 'Contact is deceased' },
    { name: 'Hostile/Rude', category: 'negative', retryEligible: false, description: 'Customer was hostile or rude' }
  ],
  neutral: [
    { name: 'Answering Machine', category: 'neutral', retryEligible: true, retryDelay: 4, description: 'Reached answering machine' },
    { name: 'Call Back - CALL ME', category: 'neutral', retryEligible: true, retryDelay: 24, description: 'Customer requested callback' },
    { name: 'Call Transferred', category: 'neutral', retryEligible: true, retryDelay: 2, description: 'Call transferred to another person' },
    { name: 'Disconnected', category: 'neutral', retryEligible: true, retryDelay: 2, description: 'Call was disconnected' },
    { name: 'Open Chain', category: 'neutral', retryEligible: true, retryDelay: 4, description: 'Open chain/inquiry' },
    { name: 'Query', category: 'neutral', retryEligible: true, retryDelay: 24, description: 'Customer has questions' },
    { name: 'Removed Appliance', category: 'neutral', retryEligible: true, retryDelay: 48, description: 'Appliance was removed' },
    { name: 'No Answer', category: 'neutral', retryEligible: true, retryDelay: 4, description: 'No one answered the call' },
    { name: 'Busy', category: 'neutral', retryEligible: true, retryDelay: 1, description: 'Line was busy' },
    { name: 'Voicemail Left', category: 'neutral', retryEligible: true, retryDelay: 24, description: 'Left voicemail message' }
  ],
  positive: [
    { name: 'Aged Product', category: 'positive', retryEligible: false, description: 'Product is aged/qualified' },
    { name: 'Field Payment Save', category: 'positive', retryEligible: false, description: 'Field payment saved' },
    { name: 'Live Work', category: 'positive', retryEligible: false, description: 'Live work opportunity' },
    { name: 'Save', category: 'positive', retryEligible: false, description: 'Successfully saved customer' },
    { name: 'Upload', category: 'positive', retryEligible: false, description: 'Information uploaded' },
    { name: 'Sale Made', category: 'positive', retryEligible: false, description: 'Sale completed successfully' },
    { name: 'Appointment Booked', category: 'positive', retryEligible: false, description: 'Appointment scheduled' },
    { name: 'Interest Shown', category: 'positive', retryEligible: true, retryDelay: 48, description: 'Customer showed interest' },
    { name: 'Information Sent', category: 'positive', retryEligible: true, retryDelay: 72, description: 'Information sent to customer' }
  ]
};

/**
 * Initialize default dispositions in the database
 */
export async function initializeDefaultDispositions() {
  try {
    console.log('🎯 Initializing default dispositions...');

    for (const [category, dispositions] of Object.entries(defaultDispositions)) {
      for (const disposition of dispositions) {
        // Check if disposition already exists
        const existingDisposition = await prisma.disposition.findFirst({
          where: { name: disposition.name }
        });

        if (!existingDisposition) {
          await prisma.disposition.create({
            data: disposition
          });
          console.log(`✅ Created disposition: ${disposition.name}`);
        }
      }
    }

    console.log('✅ Default dispositions initialized successfully');
    return true;

  } catch (error) {
    console.error('❌ Error initializing dispositions:', error);
    return false;
  }
}

/**
 * Get all dispositions grouped by category
 */
export async function getDispositionsByCategory() {
  try {
    const dispositions = await prisma.disposition.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return {
      negative: dispositions.filter(d => d.category === 'negative'),
      neutral: dispositions.filter(d => d.category === 'neutral'),
      positive: dispositions.filter(d => d.category === 'positive')
    };

  } catch (error) {
    console.error('❌ Error fetching dispositions:', error);
    return { negative: [], neutral: [], positive: [] };
  }
}

/**
 * Get dispositions for a specific campaign
 */
export async function getCampaignDispositions(campaignId: string) {
  try {
    const campaignDispositions = await prisma.campaignDisposition.findMany({
      where: { campaignId },
      include: {
        disposition: true
      },
      orderBy: { sortOrder: 'asc' }
    });

    // If no campaign-specific dispositions, return all default ones
    if (campaignDispositions.length === 0) {
      return await getDispositionsByCategory();
    }

    // Group campaign dispositions by category
    const dispositions = campaignDispositions.map(cd => cd.disposition);
    
    return {
      negative: dispositions.filter(d => d.category === 'negative'),
      neutral: dispositions.filter(d => d.category === 'neutral'),
      positive: dispositions.filter(d => d.category === 'positive')
    };

  } catch (error) {
    console.error('❌ Error fetching campaign dispositions:', error);
    return { negative: [], neutral: [], positive: [] };
  }
}

/**
 * Add disposition to campaign
 */
export async function addDispositionToCampaign(campaignId: string, dispositionId: string, sortOrder: number = 0) {
  try {
    await prisma.campaignDisposition.create({
      data: {
        campaignId,
        dispositionId,
        sortOrder
      }
    });

    console.log(`✅ Added disposition to campaign ${campaignId}`);
    return true;

  } catch (error) {
    console.error('❌ Error adding disposition to campaign:', error);
    return false;
  }
}