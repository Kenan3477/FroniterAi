import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`📋 Proxying update data list request for ID: ${params.id}`);

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/admin/campaign-management/data-lists/${params.id}`;
    
    // Forward the request to the Railway backend
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers from the original request
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      throw new Error(`Backend responded with ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully updated data list via backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying update data list request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update data list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`📋 Proxying delete data list request for ID: ${params.id}`);

    const backendUrl = `${BACKEND_URL}/api/admin/campaign-management/data-lists/${params.id}`;
    
    // Forward the request to the Railway backend
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers from the original request
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        }),
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      throw new Error(`Backend responded with ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully deleted data list via backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying delete data list request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete data list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}