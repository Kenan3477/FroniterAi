/**
 * Data Import Service
 * Handles Excel/CSV uploads and maps them to Contact records
 * Supports the DAC Homeowner format and other lead data formats
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export interface ImportedContact {
  delivery_date?: string;
  title?: string;
  firstname: string;
  lastname: string;
  address1?: string;
  address2?: string;
  address3?: string;
  town?: string;
  county?: string;
  postcode?: string;
  contact_number: string;
  age_range?: string;
  residential_status?: string;
  // Additional fields that might be in other formats
  email?: string;
  mobile?: string;
  company?: string;
  [key: string]: any; // Allow for dynamic fields
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: number;
  listId: string;
}

/**
 * Import contacts from Excel/CSV file buffer
 */
export async function importContactData(
  fileBuffer: Buffer,
  fileName: string,
  listId: string,
  campaignId?: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    errors: [],
    duplicates: 0,
    listId
  };

  try {
    console.log(`📂 Starting import of ${fileName} to list ${listId}`);

    // Parse the file based on extension
    const contacts = await parseFileData(fileBuffer, fileName);
    
    if (contacts.length === 0) {
      result.errors.push('No data found in file');
      return result;
    }

    console.log(`📊 Found ${contacts.length} contacts to import`);

    // Process each contact
    for (let index = 0; index < contacts.length; index++) {
      const contactData = contacts[index];
      try {
        const mappedContact = mapContactData(contactData, listId);
        
        // Check for duplicates (by phone number within the same list)
        const existingContact = await prisma.contact.findFirst({
          where: {
            listId,
            phone: mappedContact.phone
          }
        });

        if (existingContact) {
          result.duplicates++;
          console.log(`⚠️  Duplicate contact: ${mappedContact.firstName} ${mappedContact.lastName} - ${mappedContact.phone}`);
          continue;
        }

        // Create the contact
        await prisma.contact.create({
          data: mappedContact
        });

        result.imported++;

        if (result.imported % 100 === 0) {
          console.log(`📈 Imported ${result.imported} contacts...`);
        }

      } catch (error) {
        const errorMsg = `Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Update the data list totals
    await prisma.dataList.update({
      where: { listId },
      data: {
        totalContacts: await prisma.contact.count({
          where: { listId }
        }),
        updatedAt: new Date()
      }
    });

    result.success = result.imported > 0;
    
    console.log(`✅ Import complete: ${result.imported} imported, ${result.duplicates} duplicates, ${result.errors.length} errors`);
    
    return result;

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown import error');
    console.error('❌ Import failed:', error);
    return result;
  }
}

/**
 * Parse Excel or CSV file data
 */
async function parseFileData(fileBuffer: Buffer, fileName: string): Promise<ImportedContact[]> {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  
  try {
    if (fileExtension === 'csv') {
      // Parse CSV
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', codepage: 65001 });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet) as ImportedContact[];
      
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet) as ImportedContact[];
      
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Map imported data to Contact model format
 */
function mapContactData(data: ImportedContact, listId: string): any {
  // Generate unique contact ID
  const contactId = `${listId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Parse delivery date if present
  let deliveryDate: Date | undefined;
  if (data.delivery_date) {
    try {
      // Handle various date formats (Excel often exports as DD/MM/YYYY)
      const dateParts = data.delivery_date.split('/');
      if (dateParts.length === 3) {
        // Assume DD/MM/YYYY format
        deliveryDate = new Date(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`);
      }
    } catch (error) {
      console.warn(`Could not parse delivery date: ${data.delivery_date}`);
    }
  }

  // Clean and validate phone number
  const phone = cleanPhoneNumber(data.contact_number);
  if (!phone) {
    throw new Error(`Invalid or missing contact number for ${data.firstname} ${data.lastname}`);
  }

  return {
    contactId,
    listId,
    firstName: data.firstname?.trim() || '',
    lastName: data.lastname?.trim() || '',
    fullName: `${data.firstname?.trim()} ${data.lastname?.trim()}`.trim(),
    title: data.title?.trim() || null,
    phone,
    email: data.email?.trim() || null,
    mobile: data.mobile?.trim() || null,
    address: data.address1?.trim() || null,
    address2: data.address2?.trim() || null,
    address3: data.address3?.trim() || null,
    city: data.town?.trim() || null,
    state: data.county?.trim() || null, // County maps to state field
    zipCode: data.postcode?.trim() || null,
    company: data.company?.trim() || null,
    deliveryDate,
    ageRange: data.age_range?.trim() || null,
    residentialStatus: data.residential_status?.trim() || null,
    status: 'new',
    attemptCount: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Clean and standardize phone numbers
 */
function cleanPhoneNumber(phone?: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except + at the start
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading zeros, but preserve + for international numbers
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // UK numbers: add 44 if missing country code
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '44' + cleaned;
  }
  
  return cleaned.length >= 10 ? cleaned : null;
}

/**
 * Preview import data without saving (for validation)
 */
export async function previewImportData(
  fileBuffer: Buffer,
  fileName: string,
  maxPreview: number = 10
): Promise<{
  success: boolean;
  preview: any[];
  totalRows: number;
  columns: string[];
  errors: string[];
}> {
  try {
    const contacts = await parseFileData(fileBuffer, fileName);
    
    return {
      success: true,
      preview: contacts.slice(0, maxPreview),
      totalRows: contacts.length,
      columns: contacts.length > 0 ? Object.keys(contacts[0]) : [],
      errors: []
    };
    
  } catch (error) {
    return {
      success: false,
      preview: [],
      totalRows: 0,
      columns: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Update contact with call outcome
 */
export async function updateContactCallOutcome(
  contactId: string,
  agentId: string,
  outcome: string,
  notes?: string
): Promise<void> {
  try {
    await prisma.contact.update({
      where: { contactId },
      data: {
        lastAgentId: agentId,
        lastOutcome: outcome,
        lastAttempt: new Date(),
        attemptCount: {
          increment: 1
        },
        status: outcome === 'answered' ? 'contacted' : 'attempted',
        notes: notes ? `${new Date().toISOString()}: ${notes}` : undefined,
        updatedAt: new Date()
      }
    });

    console.log(`📞 Updated contact ${contactId} with outcome: ${outcome}`);
    
  } catch (error) {
    console.error(`❌ Failed to update contact ${contactId}:`, error);
    throw error;
  }
}