import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/contacts/import - Import contacts from CSV
export const POST = requireAuth(async (request, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const campaignId = formData.get('campaignId') as string;
    const mode = formData.get('mode') as string || 'create'; // 'create' or 'upsert'

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!campaignId) {
      return NextResponse.json(
        { success: false, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, message: 'CSV file must contain at least a header and one data row' },
        { status: 400 }
      );
    }

    // Parse header
    const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
    
    // Expected columns
    const requiredColumns = ['firstName', 'lastName', 'phone'];
    const optionalColumns = ['email', 'company', 'status', 'tags', 'notes'];
    
    // Validate required columns
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Missing required columns: ${missingColumns.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Parse data rows
    const contacts = [];
    const errors = [];
    const duplicates = [];

    for (let i = 1; i < lines.length && i <= 1001; i++) { // Limit to 1000 contacts
      const values = lines[i].split(',').map(val => val.trim().replace(/"/g, ''));
      
      if (values.length !== header.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const contact: any = {};
      header.forEach((col, index) => {
        contact[col] = values[index] || null;
      });

      // Validate required fields
      if (!contact.firstName || !contact.lastName || !contact.phone) {
        errors.push(`Row ${i + 1}: Missing required fields (firstName, lastName, phone)`);
        continue;
      }

      // Validate phone format (basic)
      if (!/^\+?[\d\s\-\(\)]{7,20}$/.test(contact.phone)) {
        errors.push(`Row ${i + 1}: Invalid phone format`);
        continue;
      }

      // Validate email if provided
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errors.push(`Row ${i + 1}: Invalid email format`);
        continue;
      }

      // Check for duplicates in existing data
      if (mode === 'create') {
        const existingContact = await prisma.$queryRaw`
          SELECT contactId FROM contacts 
          WHERE phone = ${contact.phone} AND campaignId = ${campaignId}
          LIMIT 1
        ` as any[];

        if (existingContact.length > 0) {
          duplicates.push({ row: i + 1, phone: contact.phone });
          continue;
        }
      }

      contact.campaignId = campaignId;
      contact.status = contact.status || 'new';
      contact.tags = contact.tags ? contact.tags.split(';').map((t: string) => t.trim()) : [];
      
      contacts.push(contact);
    }

    // If too many errors, return early
    if (errors.length > 50) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many validation errors. Please fix your CSV file.',
          errors: errors.slice(0, 10)
        },
        { status: 400 }
      );
    }

    // Import contacts
    const imported = [];
    const importErrors = [];

    for (const contact of contacts) {
      try {
        const contactId = `contact_${Math.random().toString(36).substring(2, 15)}`;
        
        if (mode === 'upsert') {
          // Try to update existing contact first
          const existingContact = await prisma.$queryRaw`
            SELECT contactId FROM contacts 
            WHERE phone = ${contact.phone} AND campaignId = ${campaignId}
            LIMIT 1
          ` as any[];

          if (existingContact.length > 0) {
            await prisma.$executeRaw`
              UPDATE contacts 
              SET firstName = ${contact.firstName},
                  lastName = ${contact.lastName},
                  email = ${contact.email},
                  company = ${contact.company},
                  status = ${contact.status},
                  tags = ${JSON.stringify(contact.tags)},
                  notes = ${contact.notes || null},
                  updatedAt = NOW()
              WHERE contactId = ${existingContact[0].contactId}
            `;
            imported.push({ ...contact, contactId: existingContact[0].contactId, action: 'updated' });
            continue;
          }
        }

        // Create new contact
        await prisma.$executeRaw`
          INSERT INTO contacts (
            contactId, firstName, lastName, email, phone, company, campaignId,
            status, tags, notes, createdAt, updatedAt
          ) VALUES (
            ${contactId}, ${contact.firstName}, ${contact.lastName}, 
            ${contact.email}, ${contact.phone}, ${contact.company}, ${campaignId},
            ${contact.status}, ${JSON.stringify(contact.tags)}, 
            ${contact.notes || null}, NOW(), NOW()
          )
        `;
        
        imported.push({ ...contact, contactId, action: 'created' });

      } catch (error) {
        importErrors.push({
          contact: `${contact.firstName} ${contact.lastName}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${imported.length} contacts processed.`,
      data: {
        imported: imported.length,
        duplicates: duplicates.length,
        errors: errors.length + importErrors.length,
        details: {
          importedContacts: imported,
          duplicateContacts: duplicates,
          validationErrors: errors,
          importErrors: importErrors
        }
      }
    });

  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to import contacts' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// GET /api/contacts/import/template - Download CSV template
export const GET = requireAuth(async (request, user) => {
  const template = [
    'firstName,lastName,phone,email,company,status,tags,notes',
    'John,Doe,+1234567890,john.doe@example.com,Acme Corp,new,"lead;hot",Sample contact'
  ].join('\n');

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="contact_import_template.csv"'
    }
  });
});