import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    console.log(`📞 Frontend: Attempting dial method update for campaign ${params.id} to ${body.dialMethod}`);
    
    // Try to proxy to backend with the provided ID first
    let response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/dial-method`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // If the first attempt fails with 404 (wrong ID format), try to get the correct campaignId
    if (response.status === 404 && (params.id.includes('-') || params.id.startsWith('cm'))) {
      console.log('🔍 UUID failed, trying to get campaignId from campaign data...');
      
      try {
        // Fetch the campaign to get its campaignId field
        const campaignResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}`);
        
        if (campaignResponse.ok) {
          const campaignData = await campaignResponse.json();
          
          if (campaignData.success && campaignData.data?.campaignId) {
            const campaignId = campaignData.data.campaignId;
            console.log(`✅ Found campaignId: ${campaignId}, retrying dial method update...`);
            
            // Retry with the correct campaignId
            response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignId}/dial-method`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });
          }
        }
      } catch (retryError) {
        console.log('⚠️ Retry attempt failed, using original response');
      }
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Backend dial method update failed: ${response.status}`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    console.log(`✅ Campaign dial method updated successfully`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying dial method update:', error);
    return NextResponse.json(
      { error: 'Failed to update dial method' },
      { status: 500 }
    );
  }
}