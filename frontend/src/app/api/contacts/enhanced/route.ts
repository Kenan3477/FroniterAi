import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { withRequestLogging } from '@/middleware/logging';
import { PrismaClient } from '@prisma/client';
import { validateData, paginationSchema } from '@/lib/validation';
import { SuccessResponseBuilder } from '@/lib/errors';

const prisma = new PrismaClient();

export const GET = withRequestLogging(requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate pagination parameters
    const paginationParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '25',
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      search: searchParams.get('search') || undefined
    };
    
    const paginationValidation = paginationSchema.safeParse(paginationParams);

    if (!paginationValidation.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: paginationValidation.error.errors.map(err => err.message)
      }, { status: 400 });
    }

    const { page, limit, sortBy, sortOrder, search } = paginationValidation.data;
    const offset = ((page || 1) - 1) * (limit || 25);
    
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    // Build where conditions
    const whereConditions = [];
    
    // EXCLUDE fake imported contacts from enhanced contacts API
    whereConditions.push(`
      (c.firstName != 'Imported' 
       AND c.listId NOT IN ('TWILIO-IMPORT', 'IMPORTED-CONTACTS')
       AND c.contactId NOT LIKE 'imported-%')
    `);
    
    // For agents, only show contacts from their assigned campaigns
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
    
    if (search) {
      whereConditions.push(`
        (c.firstName LIKE '%${search}%' 
         OR c.lastName LIKE '%${search}%' 
         OR c.email LIKE '%${search}%' 
         OR c.phone LIKE '%${search}%'
         OR c.company LIKE '%${search}%')
      `);
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map(tag => `c.tags LIKE '%"${tag}"%'`).join(' OR ');
      whereConditions.push(`(${tagConditions})`);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Determine sort column
    const sortColumn = sortBy === 'name' ? 'c.lastName' :
                      sortBy === 'lastContact' ? 'c.lastContactAt' :
                      sortBy === 'score' ? 'c.score' :
                      'c.createdAt';

    // Get contacts with enhanced data
    const contactsQuery = `
      SELECT 
        c.contactId, c.firstName, c.lastName, c.email, c.phone, c.company,
        c.status, c.score, c.tags, c.customFields, c.lastContactAt,
        c.createdAt, c.updatedAt,
        cp.name as campaignName,
        COUNT(cr.id) as totalCalls,
        SUM(CASE WHEN cr.outcome = 'connected' THEN 1 ELSE 0 END) as connectedCalls,
        MAX(cr.startTime) as lastCallTime,
        AVG(cr.duration) as avgCallDuration
      FROM contacts c
      LEFT JOIN campaigns cp ON c.campaignId = cp.campaignId
      LEFT JOIN call_records cr ON c.contactId = cr.contactId
      ${whereClause}
      GROUP BY c.contactId
      ORDER BY ${sortColumn} ${sortOrder?.toUpperCase()}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const contacts = await prisma.$queryRawUnsafe(contactsQuery) as any[];

    // Process contacts data
    const enhancedContacts = contacts.map(contact => ({
      ...contact,
      tags: contact.tags ? JSON.parse(contact.tags) : [],
      customFields: contact.customFields ? JSON.parse(contact.customFields) : {},
      fullName: `${contact.firstName} ${contact.lastName}`,
      contactRate: contact.totalCalls > 0 ? 
        Math.round((contact.connectedCalls / contact.totalCalls) * 100) : 0,
      avgCallDuration: contact.avgCallDuration ? Math.round(contact.avgCallDuration) : 0
    }));

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT c.contactId) as total
      FROM contacts c
      LEFT JOIN campaigns cp ON c.campaignId = cp.campaignId
      ${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(countQuery) as any[];
    const total = totalResult[0]?.total || 0;

    // Log the request
    console.log('Contacts fetched', {
      userId: user.userId,
      contactCount: enhancedContacts.length,
      campaignId,
      search: search ? 'present' : 'none'
    });

    return SuccessResponseBuilder.paginated(
      enhancedContacts,
      page || 1,
      limit || 25,
      total,
      'request-id', // request.correlationId,
      'Contacts retrieved successfully'
    );

  } catch (error) {
    console.error('Error fetching enhanced contacts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.userId
    });

    return NextResponse.json(
      { success: false, message: 'Failed to fetch contacts' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}));