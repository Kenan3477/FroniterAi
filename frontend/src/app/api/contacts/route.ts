import { NextRequest, NextResponse } from 'next/server';

interface DeleteContactResponse {
  success: boolean;
  message?: string;
  error?: {
    message: string;
    code: string;
  };
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { contactId: string } }
): Promise<NextResponse<DeleteContactResponse>> {
  console.log('🗑️ Contact deletion API called');
  
  try {
    const { contactId } = params;

    console.log(`🗑️ Deleting contact with ID: ${contactId}`);

    // Validate required fields
    if (!contactId) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Contact ID is required',
          code: 'MISSING_CONTACT_ID'
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
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app'}/api/contacts/${contactId}`;
    
    console.log(`🔗 Proxying contact deletion to backend: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend contact deletion failed: ${response.status} - ${errorText}`);
      
      return NextResponse.json({
        success: false,
        error: {
          message: `Contact deletion failed: ${response.status} ${response.statusText}. Details: ${errorText}`,
          code: 'BACKEND_ERROR'
        }
      }, { status: response.status });
    }

    const result = await response.json();
    console.log(`✅ Backend contact deletion response:`, result);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('❌ Contact deletion API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete contact',
        code: 'INTERNAL_ERROR'
      }
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}