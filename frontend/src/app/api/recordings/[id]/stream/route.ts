import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordingId = params.id;
    console.log('🎵 Streaming recording:', recordingId);

    // Handle demo recordings
    if (recordingId.startsWith('demo-') || recordingId === 'test-recording') {
      console.log('🎵 Serving demo recording:', recordingId);
      
      // Redirect to specific demo recording endpoints
      if (recordingId === 'demo-recording-file-1' || recordingId === 'test-recording') {
        return NextResponse.redirect(new URL('/api/recordings/demo-1/stream', request.url));
      } else if (recordingId === 'demo-recording-file-2') {
        return NextResponse.redirect(new URL('/api/recordings/demo-2/stream', request.url));
      }
      
      // Fallback for other demo recordings
      return NextResponse.redirect(new URL('/api/recordings/demo-1/stream', request.url));
    }

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found for recording stream');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/recordings/${recordingId}/stream`;
    console.log('📡 Streaming from backend:', backendUrl);

    // Forward the request to the Railway backend with auth
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend stream response not ok: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Recording not found',
            message: 'This recording file does not exist. It may not have been synced from Twilio yet.',
            details: {
              recordingId,
              backendUrl,
              status: response.status
            }
          },
          { status: 404 }
        );
      }
      
      if (response.status >= 500) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Backend service unavailable',
            message: 'The recording backend service is currently unavailable. Please try again later.',
            details: {
              recordingId,
              backendUrl,
              status: response.status
            }
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Recording stream not available (${response.status})`,
          message: 'Unable to stream the recording file.',
          details: {
            recordingId,
            backendUrl,
            status: response.status
          }
        },
        { status: response.status }
      );
    }

    // Get the content type from backend response
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // Stream the recording data back to the frontend
    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    console.log('✅ Successfully streaming recording:', { recordingId, contentType, contentLength });

    // Return the stream
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('❌ Recording stream error:', error);
    
    // Handle different types of errors
    let errorMessage = 'Failed to stream recording';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        errorMessage = 'Backend service unavailable - cannot reach recording server';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Recording stream timeout - server took too long to respond';
        statusCode = 504;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: 'Unable to stream the recording. The backend service may be unavailable.',
        details: {
          recordingId: params.id,
          backendUrl: BACKEND_URL,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      },
      { status: statusCode }
    );
  }
}