import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const data = await response.json();
    
    if (data.success && data.data) {
      // Filter only active campaigns and format for header dropdown
      const activeCampaigns = data.data
        .filter((campaign: any) => campaign.status === 'Active')
        .map((campaign: any) => ({
          campaignId: campaign.id || campaign.campaignId,
          name: campaign.name || campaign.displayName,
          displayName: campaign.displayName || campaign.name,
          type: campaign.type,
          dialMethod: campaign.dialMethod,
          status: campaign.status
        }));

      return NextResponse.json({
        success: true,
        campaigns: activeCampaigns
      });
    }
    
    return NextResponse.json({
      success: false,
      campaigns: [],
      error: 'No campaign data received'
    });
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return NextResponse.json(
      { 
        success: false,
        campaigns: [],
        error: 'Failed to fetch active campaigns' 
      },
      { status: 500 }
    );
  }
}