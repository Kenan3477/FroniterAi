import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    // Get authentication token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('token')?.value;

    if (!authToken) {
      console.error('🔑 No authentication token found');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract query parameters for report export
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const campaignId = searchParams.get('campaignId');
    const agentId = searchParams.get('agentId');
    const format = searchParams.get('format') || 'csv';

    console.log('📄 Exporting report:', {
      type: reportType,
      startDate,
      endDate,
      campaignId,
      agentId,
      format
    });

    // Forward request to Railway backend
    const backendParams = new URLSearchParams();
    backendParams.append('type', reportType);
    if (startDate) backendParams.append('startDate', startDate);
    if (endDate) backendParams.append('endDate', endDate);
    if (campaignId) backendParams.append('campaignId', campaignId);
    if (agentId) backendParams.append('agentId', agentId);
    backendParams.append('format', format);

    const backendResponse = await fetch(`${BACKEND_URL}/api/reports/export?${backendParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('❌ Backend export failed:', backendResponse.status, errorText);
      
      return NextResponse.json(
        { success: false, error: `Backend export failed: ${backendResponse.statusText}` },
        { status: backendResponse.status }
      );
    }

    // Get the file content and headers from backend
    const fileContent = await backendResponse.arrayBuffer();
    const contentType = backendResponse.headers.get('content-type') || 'text/csv';
    const contentDisposition = backendResponse.headers.get('content-disposition') || 
      `attachment; filename="${reportType}-export.${format}"`;

    console.log('✅ Report export successful:', {
      contentType,
      contentDisposition,
      size: fileContent.byteLength
    });

    // Return the file with proper headers for download
    return new Response(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': fileContent.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Report export error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Report export failed' 
      },
      { status: 500 }
    );
  }
}