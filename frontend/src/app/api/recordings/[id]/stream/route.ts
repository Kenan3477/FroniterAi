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

    // Get auth token from cookies or Authorization header
    let authToken = request.cookies.get('auth-token')?.value;
    
    // If no cookie, try to get from Authorization header (for direct API calls)
    if (!authToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        authToken = authHeader.substring(7);
      }
    }
    
    // Final fallback: check for x-auth-token header (sometimes used by client-side code)
    if (!authToken) {
      authToken = request.headers.get('x-auth-token') || undefined;
    }
    
    console.log('🔒 Auth token found:', authToken ? `${authToken.substring(0, 10)}...` : 'NONE');
    
    if (!authToken) {
      console.log('❌ No authentication token found in any source (cookie, Authorization header, x-auth-token)');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: 'No authentication token found. Please log in and try again.',
          details: {
            recordingId,
            sources_checked: ['cookie:auth-token', 'header:authorization', 'header:x-auth-token']
          }
        },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/recordings/${recordingId}/stream`;
    console.log('📡 Attempting to stream from backend:', backendUrl);

    // Prepare headers for backend request
    const backendHeaders: Record<string, string> = {};
    if (authToken) {
      backendHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    // Forward the request to the Railway backend with auth
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: backendHeaders,
    });

    console.log(`📡 Backend response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ Backend stream response not ok: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required',
            message: 'You need to be logged in to access recordings. Please log in and try again.',
            details: {
              recordingId,
              backendUrl,
              status: response.status,
              authTokenPresent: !!authToken
            }
          },
          { status: 401 }
        );
      }
      
      if (response.status === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Access denied',
            message: 'You do not have permission to access this recording.',
            details: {
              recordingId,
              backendUrl,
              status: response.status
            }
          },
          { status: 403 }
        );
      }
      
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
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    console.log('✅ Successfully streaming recording:', { recordingId, contentType, contentLength });

    // Return the stream
    return new NextResponse(response.body, {
      status: 200,
      headers: responseHeaders,
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