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
    if (recordingId.startsWith('demo-')) {
      console.log('🎵 Serving demo recording:', recordingId);
      
      // Redirect to specific demo recording endpoints
      if (recordingId === 'demo-recording-file-1') {
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
      return NextResponse.json(
        { success: false, error: `Recording stream not available` },
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
    return NextResponse.json(
      { success: false, error: 'Failed to stream recording' },
      { status: 500 }
    );
  }
}