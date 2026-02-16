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
    const { pathname } = new URL(request.url);
    
    // Determine endpoint type (stream or download)
    const isStream = pathname.includes('/stream');
    const isDownload = pathname.includes('/download');
    
    let backendPath: string;
    if (isStream) {
      backendPath = `/api/recordings/${recordingId}/stream`;
    } else if (isDownload) {
      backendPath = `/api/recordings/${recordingId}/download`;
    } else {
      // Default to stream for compatibility
      backendPath = `/api/recordings/${recordingId}/stream`;
    }

    console.log('🎵 Proxying recording request:', { recordingId, backendPath, isStream, isDownload });

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log('🔒 No auth token found for recording access');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}${backendPath}`;
    console.log('📡 Fetching from backend:', backendUrl);

    // Forward the request to the Railway backend with auth
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend recording response not ok: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { success: false, error: `Recording not found or access denied` },
        { status: response.status }
      );
    }

    // Get the content type from backend response
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // Stream the recording data back to the frontend
    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    if (isDownload) {
      const filename = response.headers.get('content-disposition') || `recording-${recordingId}.mp3`;
      headers['Content-Disposition'] = filename;
    }

    // Return the stream
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('❌ Recording proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recording' },
      { status: 500 }
    );
  }
}