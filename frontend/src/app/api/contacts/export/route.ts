import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/contacts/export - Export contacts to CSV
export const GET = requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');
    const format = searchParams.get('format') || 'csv'; // csv, json
    const includeStats = searchParams.get('includeStats') === 'true';

    // Build where conditions
    const whereConditions = [];
    
    // For agents, only export contacts from their assigned campaigns
    if (user.role === 'AGENT') {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM agent_campaign_assignments aca 
          WHERE aca.agentId = '${user.userId}' 
            AND aca.campaignId = c.campaignId
            AND aca.isActive = 1
        )
      `);
    }
    
    if (campaignId) {
      whereConditions.push(`c.campaignId = '${campaignId}'`);
    }
    
    if (status) {
      whereConditions.push(`c.status = '${status}'`);
    }
    
    // Exclude deleted contacts
    whereConditions.push(`c.status != 'deleted'`);

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Base query
    let query = `
      SELECT 
        c.contactId, c.firstName, c.lastName, c.email, c.phone, c.company,
        c.status, c.tags, c.notes, c.lastContactAt, c.createdAt, c.updatedAt,
        cp.name as campaignName
    `;

    // Add stats if requested
    if (includeStats) {
      query += `,
        COUNT(cr.id) as totalCalls,
        SUM(CASE WHEN cr.outcome = 'connected' THEN 1 ELSE 0 END) as connectedCalls,
        MAX(cr.startTime) as lastCallTime,
        AVG(cr.duration) as avgCallDuration
      `;
    }

    query += `
      FROM contacts c
      LEFT JOIN campaigns cp ON c.campaignId = cp.campaignId
    `;

    if (includeStats) {
      query += `LEFT JOIN call_records cr ON c.contactId = cr.contactId`;
    }

    query += `
      ${whereClause}
    `;

    if (includeStats) {
      query += `GROUP BY c.contactId`;
    }

    query += `
      ORDER BY c.createdAt DESC
      LIMIT 10000
    `;

    const contacts = await prisma.$queryRawUnsafe(query) as any[];

    if (format === 'json') {
      // JSON export
      const formattedContacts = contacts.map(contact => ({
        ...contact,
        tags: contact.tags ? JSON.parse(contact.tags) : [],
        fullName: `${contact.firstName} ${contact.lastName}`,
        ...(includeStats && {
          stats: {
            totalCalls: contact.totalCalls || 0,
            connectedCalls: contact.connectedCalls || 0,
            lastCallTime: contact.lastCallTime,
            avgCallDuration: contact.avgCallDuration ? Math.round(contact.avgCallDuration) : 0,
            contactRate: contact.totalCalls > 0 ? 
              Math.round(((contact.connectedCalls || 0) / contact.totalCalls) * 100) : 0
          }
        })
      }));

      return NextResponse.json({
        success: true,
        data: formattedContacts,
        exportedAt: new Date().toISOString(),
        totalRecords: contacts.length
      });

    } else {
      // CSV export
      const headers = [
        'contactId', 'firstName', 'lastName', 'email', 'phone', 'company',
        'status', 'tags', 'notes', 'campaignName', 'lastContactAt', 'createdAt'
      ];

      if (includeStats) {
        headers.push('totalCalls', 'connectedCalls', 'lastCallTime', 'avgCallDuration', 'contactRate');
      }

      const csvRows = [headers.join(',')];

      contacts.forEach(contact => {
        const row = [
          contact.contactId,
          contact.firstName,
          contact.lastName,
          contact.email || '',
          contact.phone,
          contact.company || '',
          contact.status,
          contact.tags || '',
          contact.notes ? `"${contact.notes.replace(/"/g, '""')}"` : '',
          contact.campaignName || '',
          contact.lastContactAt || '',
          contact.createdAt
        ];

        if (includeStats) {
          const totalCalls = contact.totalCalls || 0;
          const connectedCalls = contact.connectedCalls || 0;
          const contactRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

          row.push(
            totalCalls.toString(),
            connectedCalls.toString(),
            contact.lastCallTime || '',
            contact.avgCallDuration ? Math.round(contact.avgCallDuration).toString() : '0',
            contactRate.toString()
          );
        }

        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `contacts_export_${timestamp}.csv`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

  } catch (error) {
    console.error('Error exporting contacts:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export contacts' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/contacts/export - Export specific contacts
export const POST = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { contactIds, format = 'csv', includeStats = false } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Contact IDs are required' },
        { status: 400 }
      );
    }

    // Limit to 1000 contacts
    if (contactIds.length > 1000) {
      return NextResponse.json(
        { success: false, message: 'Cannot export more than 1000 contacts at once' },
        { status: 400 }
      );
    }

    // Build query with access control
    const contactIdsPlaceholder = contactIds.map(() => '?').join(',');
    let accessCondition = '';
    const queryParams = [...contactIds];

    if (user.role === 'AGENT') {
      accessCondition = `AND EXISTS (
        SELECT 1 FROM agent_campaign_assignments aca 
        WHERE aca.agentId = ? 
          AND aca.campaignId = c.campaignId
          AND aca.isActive = 1
      )`;
      queryParams.push(user.userId.toString());
    }

    let query = `
      SELECT 
        c.contactId, c.firstName, c.lastName, c.email, c.phone, c.company,
        c.status, c.tags, c.notes, c.lastContactAt, c.createdAt, c.updatedAt,
        cp.name as campaignName
    `;

    if (includeStats) {
      query += `,
        COUNT(cr.id) as totalCalls,
        SUM(CASE WHEN cr.outcome = 'connected' THEN 1 ELSE 0 END) as connectedCalls,
        MAX(cr.startTime) as lastCallTime,
        AVG(cr.duration) as avgCallDuration
      `;
    }

    query += `
      FROM contacts c
      LEFT JOIN campaigns cp ON c.campaignId = cp.campaignId
    `;

    if (includeStats) {
      query += `LEFT JOIN call_records cr ON c.contactId = cr.contactId`;
    }

    query += `
      WHERE c.contactId IN (${contactIdsPlaceholder}) ${accessCondition}
    `;

    if (includeStats) {
      query += `GROUP BY c.contactId`;
    }

    query += `ORDER BY c.createdAt DESC`;

    const contacts = await prisma.$queryRawUnsafe(query, ...queryParams) as any[];

    // Process the results similar to GET method
    if (format === 'json') {
      const formattedContacts = contacts.map(contact => ({
        ...contact,
        tags: contact.tags ? JSON.parse(contact.tags) : [],
        fullName: `${contact.firstName} ${contact.lastName}`,
        ...(includeStats && {
          stats: {
            totalCalls: contact.totalCalls || 0,
            connectedCalls: contact.connectedCalls || 0,
            lastCallTime: contact.lastCallTime,
            avgCallDuration: contact.avgCallDuration ? Math.round(contact.avgCallDuration) : 0,
            contactRate: contact.totalCalls > 0 ? 
              Math.round(((contact.connectedCalls || 0) / contact.totalCalls) * 100) : 0
          }
        })
      }));

      return NextResponse.json({
        success: true,
        data: formattedContacts,
        exportedAt: new Date().toISOString(),
        totalRecords: contacts.length
      });

    } else {
      // Generate CSV similar to GET method
      const headers = [
        'contactId', 'firstName', 'lastName', 'email', 'phone', 'company',
        'status', 'tags', 'notes', 'campaignName', 'lastContactAt', 'createdAt'
      ];

      if (includeStats) {
        headers.push('totalCalls', 'connectedCalls', 'lastCallTime', 'avgCallDuration', 'contactRate');
      }

      const csvRows = [headers.join(',')];

      contacts.forEach(contact => {
        const row = [
          contact.contactId,
          contact.firstName,
          contact.lastName,
          contact.email || '',
          contact.phone,
          contact.company || '',
          contact.status,
          contact.tags || '',
          contact.notes ? `"${contact.notes.replace(/"/g, '""')}"` : '',
          contact.campaignName || '',
          contact.lastContactAt || '',
          contact.createdAt
        ];

        if (includeStats) {
          const totalCalls = contact.totalCalls || 0;
          const connectedCalls = contact.connectedCalls || 0;
          const contactRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

          row.push(
            totalCalls.toString(),
            connectedCalls.toString(),
            contact.lastCallTime || '',
            contact.avgCallDuration ? Math.round(contact.avgCallDuration).toString() : '0',
            contactRate.toString()
          );
        }

        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `selected_contacts_${timestamp}.csv`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

  } catch (error) {
    console.error('Error exporting selected contacts:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export selected contacts' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});