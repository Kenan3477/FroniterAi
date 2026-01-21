/**
 * Data Export Service
 * Exports contact data with call results back to Excel/CSV format
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export interface ExportOptions {
  listId?: string;
  campaignId?: string;
  status?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeCallHistory?: boolean;
  format: 'excel' | 'csv';
}

export interface ExportedContact {
  // Original data fields
  delivery_date: string | null;
  title: string | null;
  firstname: string;
  lastname: string;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  contact_number: string;
  age_range: string | null;
  residential_status: string | null;
  email: string | null;
  
  // Call tracking results
  contact_status: string;
  attempt_count: number;
  last_attempt: string | null;
  next_attempt: string | null;
  last_outcome: string | null;
  last_agent: string | null;
  total_call_duration: number;
  first_contact_date: string | null;
  final_disposition: string | null;
  
  // List info
  list_name: string;
  created_date: string;
  updated_date: string;
}

/**
 * Export contacts from a data list with call results
 */
export async function exportContactData(options: ExportOptions): Promise<Buffer> {
  try {
    console.log(`📤 Starting export with options:`, options);

    // Build where clause based on options
    const whereClause: any = {};

    if (options.listId) {
      whereClause.listId = options.listId;
    }

    if (options.status && options.status.length > 0) {
      whereClause.status = { in: options.status };
    }

    if (options.dateRange) {
      whereClause.createdAt = {
        gte: options.dateRange.startDate,
        lte: options.dateRange.endDate
      };
    }

    // Get contacts with related data
    const contacts = await prisma.contact.findMany({
      where: whereClause,
      include: {
        list: {
          select: {
            name: true
          }
        },
        callRecords: {
          include: {
            agent: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📊 Found ${contacts.length} contacts to export`);

    // Transform data for export
    const exportData: ExportedContact[] = contacts.map((contact: any) => {
      const callRecords = contact.callRecords || [];
      const firstCall = callRecords[0];
      const lastCall = callRecords[callRecords.length - 1];
      
      const totalDuration = callRecords.reduce((sum: number, call: any) => sum + (call.duration || 0), 0);
      
      return {
        // Original data
        delivery_date: contact.deliveryDate ? formatDate(contact.deliveryDate) : null,
        title: contact.title,
        firstname: contact.firstName,
        lastname: contact.lastName,
        address1: contact.address,
        address2: contact.address2,
        address3: contact.address3,
        town: contact.city,
        county: contact.state,
        postcode: contact.zipCode,
        contact_number: contact.phone,
        age_range: contact.ageRange,
        residential_status: contact.residentialStatus,
        email: contact.email,
        
        // Call results
        contact_status: contact.status,
        attempt_count: contact.attemptCount,
        last_attempt: contact.lastAttempt ? formatDateTime(contact.lastAttempt) : null,
        next_attempt: contact.nextAttempt ? formatDateTime(contact.nextAttempt) : null,
        last_outcome: contact.lastOutcome,
        last_agent: lastCall?.agent ? `${lastCall.agent.firstName} ${lastCall.agent.lastName}` : null,
        total_call_duration: totalDuration,
        first_contact_date: firstCall ? formatDateTime(firstCall.startTime) : null,
        final_disposition: contact.status === 'final' ? contact.lastOutcome : null,
        
        // Metadata
        list_name: contact.list.name,
        created_date: formatDateTime(contact.createdAt),
        updated_date: formatDateTime(contact.updatedAt)
      };
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contact Data');

    // Add column widths for better readability
    const columnWidths = [
      { wch: 12 }, // delivery_date
      { wch: 6 },  // title
      { wch: 15 }, // firstname
      { wch: 15 }, // lastname
      { wch: 25 }, // address1
      { wch: 25 }, // address2
      { wch: 25 }, // address3
      { wch: 15 }, // town
      { wch: 15 }, // county
      { wch: 10 }, // postcode
      { wch: 15 }, // contact_number
      { wch: 10 }, // age_range
      { wch: 15 }, // residential_status
      { wch: 25 }, // email
      { wch: 12 }, // contact_status
      { wch: 10 }, // attempt_count
      { wch: 18 }, // last_attempt
      { wch: 18 }, // next_attempt
      { wch: 15 }, // last_outcome
      { wch: 15 }, // last_agent
      { wch: 12 }, // total_call_duration
      { wch: 18 }, // first_contact_date
      { wch: 15 }, // final_disposition
      { wch: 20 }, // list_name
      { wch: 18 }, // created_date
      { wch: 18 }  // updated_date
    ];

    worksheet['!cols'] = columnWidths;

    // Generate file buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: options.format === 'csv' ? 'csv' : 'xlsx'
    });

    console.log(`✅ Export complete: ${contacts.length} contacts exported`);
    
    return buffer;

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

/**
 * Export call results summary
 */
export async function exportCallSummary(options: ExportOptions): Promise<Buffer> {
  try {
    console.log(`📊 Exporting call summary`);

    // Get call records with campaign and contact info
    const whereClause: any = {};

    if (options.campaignId) {
      whereClause.campaignId = options.campaignId;
    }

    if (options.dateRange) {
      whereClause.startTime = {
        gte: options.dateRange.startDate,
        lte: options.dateRange.endDate
      };
    }

    const callRecords = await prisma.callRecord.findMany({
      where: whereClause,
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            list: {
              select: {
                name: true
              }
            }
          }
        },
        agent: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        campaign: {
          select: {
            name: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    const summaryData = callRecords.map(call => ({
      call_date: formatDateTime(call.startTime),
      call_duration: call.duration || 0,
      contact_name: `${call.contact.firstName} ${call.contact.lastName}`,
      contact_phone: call.contact.phone,
      agent_name: call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : 'Unknown',
      campaign_name: call.campaign.name,
      list_name: call.contact.list.name,
      outcome: call.outcome || 'No outcome',
      notes: call.notes || '',
      call_type: call.callType
    }));

    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Call Summary');

    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: options.format === 'csv' ? 'csv' : 'xlsx'
    });

    console.log(`✅ Call summary export complete: ${callRecords.length} calls`);
    
    return buffer;

  } catch (error) {
    console.error('❌ Call summary export failed:', error);
    throw error;
  }
}

/**
 * Get export statistics
 */
export async function getExportStats(options: ExportOptions) {
  try {
    const whereClause: any = {};

    if (options.listId) {
      whereClause.listId = options.listId;
    }

    if (options.status && options.status.length > 0) {
      whereClause.status = { in: options.status };
    }

    if (options.dateRange) {
      whereClause.createdAt = {
        gte: options.dateRange.startDate,
        lte: options.dateRange.endDate
      };
    }

    const totalContacts = await prisma.contact.count({
      where: whereClause
    });

    const statusCounts = await prisma.contact.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        status: true
      }
    });

    const outcomeCounts = await prisma.contact.groupBy({
      by: ['lastOutcome'],
      where: {
        ...whereClause,
        lastOutcome: { not: null }
      },
      _count: {
        lastOutcome: true
      }
    });

    return {
      totalContacts,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
      outcomeBreakdown: outcomeCounts.reduce((acc, item) => {
        acc[item.lastOutcome || 'Unknown'] = item._count.lastOutcome;
        return acc;
      }, {} as Record<string, number>)
    };

  } catch (error) {
    console.error('❌ Error getting export stats:', error);
    return {
      totalContacts: 0,
      statusBreakdown: {},
      outcomeBreakdown: {}
    };
  }
}

/**
 * Format date for Excel export (DD/MM/YYYY)
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format datetime for Excel export
 */
function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}