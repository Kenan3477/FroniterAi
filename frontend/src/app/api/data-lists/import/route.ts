import { NextRequest, NextResponse } from 'next/server';
import { importContactData, previewImportData } from '@/services/dataImportService';

/**
 * POST /api/data-lists/import
 * Handles Excel/CSV file upload and contact data import
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📂 Data import request received');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listId = formData.get('listId') as string;
    const campaignId = formData.get('campaignId') as string | undefined;
    const action = formData.get('action') as string; // 'preview' or 'import'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (action === 'preview') {
      // Preview mode - show sample data for validation
      console.log(`👁️  Previewing data from ${file.name}`);
      
      const preview = await previewImportData(fileBuffer, file.name, 10);
      
      return NextResponse.json({
        success: true,
        action: 'preview',
        data: preview,
        fileName: file.name,
        fileSize: file.size
      });

    } else {
      // Import mode - actually import the data
      console.log(`📥 Importing data from ${file.name} to list ${listId}`);
      
      const importResult = await importContactData(
        fileBuffer,
        file.name,
        listId,
        campaignId
      );

      return NextResponse.json({
        success: importResult.success,
        action: 'import',
        data: {
          imported: importResult.imported,
          duplicates: importResult.duplicates,
          errors: importResult.errors,
          listId: importResult.listId
        },
        fileName: file.name,
        fileSize: file.size,
        message: `Import complete: ${importResult.imported} contacts imported, ${importResult.duplicates} duplicates skipped`
      });
    }

  } catch (error) {
    console.error('❌ Data import error:', error);
    
    return NextResponse.json(
      { 
        error: 'Import failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/data-lists/import
 * Get import format requirements and examples
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    supportedFormats: ['.xlsx', '.xls', '.csv'],
    maxFileSize: '10MB',
    requiredFields: ['firstname', 'lastname', 'contact_number'],
    optionalFields: [
      'delivery_date',
      'title',
      'address1',
      'address2', 
      'address3',
      'town',
      'county',
      'postcode',
      'age_range',
      'residential_status',
      'email',
      'mobile',
      'company'
    ],
    example: {
      delivery_date: '17/11/2025',
      title: 'Mr',
      firstname: 'John',
      lastname: 'Turner',
      address1: '4 Rough Hey Barn',
      address2: 'Rough Hey Gate',
      town: 'Accrington',
      county: 'Lancashire',
      postcode: 'BB5 3SR',
      contact_number: '7715755248',
      age_range: '55-65',
      residential_status: 'Homeowner'
    }
  });
}