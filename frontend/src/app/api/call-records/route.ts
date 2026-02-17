import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('📞 Proxying call records request to backend...');

    // Get auth token from cookies (optional for development)
    const authToken = request.cookies.get('auth-token')?.value;
    const accessToken = request.cookies.get('access-token')?.value;
    const token = request.cookies.get('token')?.value;
    
    // Debug: Log all cookies
    console.log('🍪 Available cookies:');
    request.cookies.getAll().forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value?.substring(0, 20)}...`);
    });
    
    const finalToken = authToken || accessToken || token;
    console.log('🔑 Selected token:', finalToken ? `${finalToken.substring(0, 20)}...` : 'NONE');
    
    if (!finalToken) {
      console.log('🔒 No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract query parameters for filtering
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const backendUrl = `${BACKEND_URL}/api/call-records${queryString ? `?${queryString}` : ''}`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend with auth
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (finalToken) {
      headers['Authorization'] = `Bearer ${finalToken}`;
      console.log('🔑 Sending Authorization header with token');
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - token may be expired');
        const errorData = await response.text();
        console.error('🔑 Backend error details:', errorData);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Session expired', 
            message: 'Your session has expired. Please log out and log back in.',
            shouldRefreshAuth: true,
            code: 'SESSION_EXPIRED'
          },
          { status: 401 }
        );
      }
      
      if (response.status === 404) {
        console.log('📝 Backend call-records endpoint not implemented yet - returning demo data');
        
        // Return demo data with recording file examples when backend endpoint doesn't exist
        return NextResponse.json({
          success: true,
          records: [
            {
              id: 'demo-recording-1',
              callId: 'DEMO-CALL-001',
              campaignId: 'spring-demo-campaign',
              contactId: 'demo-contact-1',
              agentId: '119',
              phoneNumber: '+447496603827',
              dialedNumber: '+447496603827',
              callType: 'outbound',
              startTime: '2026-02-16T12:46:59.245Z',
              endTime: '2026-02-16T12:48:54.871Z',
              duration: 115,
              outcome: 'completed',
              dispositionId: null,
              notes: 'Demo call with recording available',
              recording: '/api/recordings/demo-1/stream',
              transferTo: null,
              createdAt: '2026-02-16T12:46:59.246Z',
              recordingFile: {
                id: 'demo-recording-file-1',
                fileName: 'demo_recording_001.mp3',
                uploadStatus: 'completed',
                duration: 115,
                format: 'mp3',
                filePath: '/demo/recordings/demo_001.mp3'
              }
            },
            {
              id: 'demo-recording-2',
              callId: 'DEMO-CALL-002',
              campaignId: 'spring-demo-campaign',
              contactId: 'demo-contact-2',
              agentId: '119',
              phoneNumber: '+44123456789',
              dialedNumber: '+44123456789',
              callType: 'outbound',
              startTime: '2026-02-16T14:30:15.000Z',
              endTime: '2026-02-16T14:32:45.000Z',
              duration: 150,
              outcome: 'completed',
              dispositionId: null,
              notes: 'Demo call with recording - longer duration',
              recording: '/api/recordings/demo-2/stream',
              transferTo: null,
              createdAt: '2026-02-16T14:30:15.000Z',
              recordingFile: {
                id: 'demo-recording-file-2',
                fileName: 'demo_recording_002.mp3',
                uploadStatus: 'completed',
                duration: 150,
                format: 'mp3',
                filePath: '/demo/recordings/demo_002.mp3'
              }
            }
          ],
          pagination: {
            total: 2,
            limit: 25,
            currentPage: 1,
            totalPages: 1
          },
          message: 'Demo data - Backend recording system not yet deployed'
        });
      }
      
      // Return other backend error responses
      const errorText = await response.text();
      console.error('❌ Backend error details:', errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully fetched call records from backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying call records request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call records', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}