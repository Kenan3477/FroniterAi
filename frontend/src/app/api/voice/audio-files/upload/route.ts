/**
 * Frontend API Route: Audio File Upload
 * Handles audio file uploads and forwards to backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

/**
 * POST /api/voice/audio-files/upload
 * Upload a new audio file
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/voice/audio-files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
        // Don't set Content-Type, let fetch set it with boundary for multipart
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error uploading audio file:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
