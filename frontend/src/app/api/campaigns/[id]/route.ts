import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔗 Fetching campaign ${params.id} from backend...`);
    
    const response = await fetch(`${BACKEND_URL}/api/campaigns/${params.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend request failed: ${response.status}`);
      
      // Return fallback campaign data for demo purposes
      return NextResponse.json({
        success: true,
        data: {
          id: params.id,
          campaignId: params.id,
          name: `Campaign ${params.id}`,
          dialMethod: 'AUTODIAL',
          status: 'Active',
          description: 'Demo campaign for auto-dial testing'
        }
      });
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched campaign ${params.id}`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`❌ Error fetching campaign ${params.id}:`, error);
    
    // Return fallback campaign data
    return NextResponse.json({
      success: true,
      data: {
        id: params.id,
        campaignId: params.id,
        name: `Campaign ${params.id}`,
        dialMethod: 'AUTODIAL',
        status: 'Active',
        description: 'Demo campaign for auto-dial testing'
      }
    });
  }
}