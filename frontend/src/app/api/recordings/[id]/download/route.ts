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
    console.log('💾 Downloading recording:', recordingId);

    // Get auth token from cookies - CRITICAL: Use session_token (what the app actually uses!)
    let authToken = request.cookies.get('session_token')?.value;
    
    // Fallback to auth-token for backwards compatibility
    if (!authToken) {
      authToken = request.cookies.get('auth-token')?.value;
    }
    
    // Also check Authorization header
    if (!authToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        authToken = authHeader.substring(7);
      }
    }
    
    console.log('🔒 Auth token found:', authToken ? `${authToken.substring(0, 10)}...` : 'NONE');
    
    if (!authToken) {
      console.log('🔒 No auth token found for recording download');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/recordings/${recordingId}/download`;
    console.log('📡 Downloading from backend:', backendUrl);

    // Forward the request to the Railway backend with auth
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend download response not ok: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { success: false, error: `Recording download not available` },
        { status: response.status }
      );
    }

    // Get headers from backend response
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    const contentDisposition = response.headers.get('content-disposition') || `attachment; filename="recording-${recordingId}.mp3"`;

    // Return the file as download
    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    console.log('✅ Successfully downloading recording:', { recordingId, contentType, contentLength, contentDisposition });

    // Return the download
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('❌ Recording download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download recording' },
      { status: 500 }
    );
  }
}