import { NextRequest, NextResponse } from 'next/server';

interface ManualDialRequest {
  contactId: string;
  phoneNumber: string;
  contactName: string;
  campaignId?: string;
  listId?: string;
}

interface ManualDialResponse {
  success: boolean;
  data?: {
    callId: string;
    status: string;
    message: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ManualDialResponse>> {
  try {
    const body: ManualDialRequest = await request.json();
    const { contactId, phoneNumber, contactName, campaignId, listId } = body;

    console.log(`📞 Manual dial request for ${contactName} (${contactId}) at ${phoneNumber}`);

    // Validate required fields
    if (!contactId || !phoneNumber || !contactName) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Missing required fields: contactId, phoneNumber, and contactName are required',
          code: 'MISSING_FIELDS'
        }
      }, { status: 400 });
    }

    // Get auth token from request
    const authToken = request.cookies.get('auth-token')?.value || 
                     request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        }
      }, { status: 401 });
    }

    // Forward request to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app'}/api/voice/manual-dial`;
    
    console.log(`🔗 Proxying manual dial to backend: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        contactId,
        phoneNumber,
        contactName,
        campaignId: campaignId || 'manual-dial',
        listId: listId || 'contacts-manual'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend manual dial failed: ${response.status} - ${errorText}`);
      
      return NextResponse.json({
        success: false,
        error: {
          message: `Manual dial failed: ${response.status} ${response.statusText}`,
          code: 'BACKEND_ERROR'
        }
      }, { status: response.status });
    }

    const result = await response.json();
    console.log(`✅ Backend manual dial response:`, result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          callId: result.data?.callId || `call_${Date.now()}`,
          status: result.data?.status || 'dialing',
          message: result.data?.message || `Calling ${contactName} at ${phoneNumber}`
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: {
          message: result.error?.message || 'Manual dial failed',
          code: result.error?.code || 'DIAL_FAILED'
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Manual dial API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}