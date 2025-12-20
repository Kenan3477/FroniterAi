import { DataList, Contact, ListCampaignLinkResult, ListLinkError } from '../types/dialQueue';

/**
 * List-Campaign Management Functions
 * Replicates Kennex's data list assignment system
 */

// Mock database - in production this would be your actual database
// Data lists will be fetched from the backend API
let mockLists: DataList[] = [];

let mockCampaigns: string[] = []; // No mock campaign IDs - empty until user creates campaigns

/**
 * 1️⃣ Link Lists to Campaigns (Kennex-style)
 * Function: assignListToCampaign(listId, campaignId)
 */
export async function assignListToCampaign(
  listId: string, 
  campaignId: string,
  options: {
    allowMigration?: boolean;
    force?: boolean;
  } = {}
): Promise<ListCampaignLinkResult> {
  
  try {
    // Validate inputs
    if (!listId || !campaignId) {
      throw new ListLinkError(
        'listId and campaignId are required',
        'VALIDATION_ERROR',
        listId,
        campaignId
      );
    }

    // Find the list
    const listIndex = mockLists.findIndex(list => list.listId === listId);
    if (listIndex === -1) {
      throw new ListLinkError(
        `List ${listId} not found`,
        'LIST_NOT_FOUND',
        listId,
        campaignId
      );
    }

    // Validate campaign exists
    if (!mockCampaigns.includes(campaignId)) {
      throw new ListLinkError(
        `Campaign ${campaignId} not found`,
        'CAMPAIGN_NOT_FOUND',
        listId,
        campaignId
      );
    }

    const list = mockLists[listIndex];
    const previousCampaignId = list.campaignId;

    // Check if already linked to another campaign
    if (list.campaignId && list.campaignId !== campaignId) {
      if (!options.allowMigration && !options.force) {
        throw new ListLinkError(
          `List ${listId} is already linked to campaign ${list.campaignId}. Use allowMigration flag to migrate.`,
          'ALREADY_LINKED',
          listId,
          campaignId
        );
      }
    }

    // Perform the assignment (Kennex-style rules)
    mockLists[listIndex] = {
      ...list,
      campaignId: campaignId,
      active: false,        // Do not start dialing yet
      blendWeight: undefined, // Must be activated in dial strategy
      updatedAt: new Date()
    };

    // Log the assignment
    console.log(`✅ List ${listId} assigned to campaign ${campaignId}`, {
      previousCampaign: previousCampaignId,
      newCampaign: campaignId,
      listName: list.name,
      totalContacts: list.totalContacts
    });

    return {
      success: true,
      message: `List ${list.name} successfully assigned to campaign ${campaignId}`,
      listId,
      campaignId,
      previousCampaignId
    };

  } catch (error) {
    if (error instanceof ListLinkError) {
      console.error(`❌ List assignment failed:`, error.message);
      return {
        success: false,
        message: error.message,
        listId,
        campaignId
      };
    }
    
    console.error(`❌ Unexpected error in assignListToCampaign:`, error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      listId,
      campaignId
    };
  }
}

/**
 * 2️⃣ Activate Lists in the Dial Strategy  
 * Function: activateListInDialStrategy(listId, blendWeight = 100)
 */
export async function activateListInDialStrategy(
  listId: string,
  blendWeight: number = 100
): Promise<ListCampaignLinkResult> {
  
  try {
    // Validate inputs
    if (!listId) {
      throw new ListLinkError(
        'listId is required',
        'VALIDATION_ERROR',
        listId
      );
    }

    if (blendWeight < 1 || blendWeight > 100) {
      throw new ListLinkError(
        'blendWeight must be between 1 and 100',
        'VALIDATION_ERROR',
        listId
      );
    }

    // Find the list
    const listIndex = mockLists.findIndex(list => list.listId === listId);
    if (listIndex === -1) {
      throw new ListLinkError(
        `List ${listId} not found`,
        'LIST_NOT_FOUND',
        listId
      );
    }

    const list = mockLists[listIndex];

    // Validate list is assigned to a campaign
    if (!list.campaignId) {
      throw new ListLinkError(
        `List ${listId} must be assigned to a campaign before activation`,
        'VALIDATION_ERROR',
        listId
      );
    }

    // Activate the list (Kennex-style)
    mockLists[listIndex] = {
      ...list,
      active: true,
      blendWeight: blendWeight,
      updatedAt: new Date()
    };

    console.log(`🚀 List ${listId} activated in dial strategy`, {
      campaignId: list.campaignId,
      blendWeight,
      listName: list.name
    });

    return {
      success: true,
      message: `List ${list.name} activated with ${blendWeight}% blend weight`,
      listId,
      campaignId: list.campaignId
    };

  } catch (error) {
    if (error instanceof ListLinkError) {
      console.error(`❌ List activation failed:`, error.message);
      return {
        success: false,
        message: error.message,
        listId
      };
    }

    console.error(`❌ Unexpected error in activateListInDialStrategy:`, error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      listId
    };
  }
}

/**
 * 5️⃣ Deactivate Lists When Needed
 * Function: deactivateList(listId)
 */
export async function deactivateList(listId: string): Promise<ListCampaignLinkResult> {
  
  try {
    // Find the list
    const listIndex = mockLists.findIndex(list => list.listId === listId);
    if (listIndex === -1) {
      throw new ListLinkError(
        `List ${listId} not found`,
        'LIST_NOT_FOUND',
        listId
      );
    }

    const list = mockLists[listIndex];

    // Deactivate the list (Kennex-style)
    mockLists[listIndex] = {
      ...list,
      active: false,          // Stop feeding new records
      blendWeight: undefined, // Clear blend weight
      updatedAt: new Date()
    };

    console.log(`⏸️ List ${listId} deactivated from dial strategy`, {
      campaignId: list.campaignId,
      listName: list.name
    });

    return {
      success: true,
      message: `List ${list.name} deactivated from dial strategy`,
      listId,
      campaignId: list.campaignId
    };

  } catch (error) {
    if (error instanceof ListLinkError) {
      console.error(`❌ List deactivation failed:`, error.message);
      return {
        success: false,
        message: error.message,
        listId
      };
    }

    console.error(`❌ Unexpected error in deactivateList:`, error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      listId
    };
  }
}

/**
 * Utility functions for managing lists
 */
export function getListsByCampaign(campaignId: string): DataList[] {
  return mockLists.filter(list => list.campaignId === campaignId);
}

export function getActiveListsByCampaign(campaignId: string): DataList[] {
  return mockLists.filter(list => 
    list.campaignId === campaignId && list.active === true
  );
}

export function getAllLists(): DataList[] {
  return [...mockLists];
}

export function getListById(listId: string): DataList | undefined {
  return mockLists.find(list => list.listId === listId);
}

// For testing purposes
export function addMockList(list: DataList): void {
  mockLists.push(list);
}

export function addMockCampaign(campaignId: string): void {
  if (!mockCampaigns.includes(campaignId)) {
    mockCampaigns.push(campaignId);
  }
}