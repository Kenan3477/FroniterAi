import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/contacts - List contacts with filtering and pagination
export const GET = requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse parameters with defaults
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const search = searchParams.get('search')?.trim();
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    const queryParams: any[] = [];
    
    // For agents, only show contacts from their assigned campaigns
    if (user.role === 'AGENT') {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM agent_campaign_assignments aca 
          WHERE aca.agentId = ? 
            AND aca.campaignId = c.campaignId
            AND aca.isActive = 1
        )
      `);
      queryParams.push(user.userId.toString());
    }
    
    if (campaignId) {
      whereConditions.push('c.campaignId = ?');
      queryParams.push(campaignId);
    }
    
    if (status) {
      whereConditions.push('c.status = ?');
      queryParams.push(status);
    }
    
    if (search) {
      whereConditions.push(`
        (c.firstName LIKE ? 
         OR c.lastName LIKE ? 
         OR c.email LIKE ? 
         OR c.phone LIKE ?
         OR c.company LIKE ?)
      `);
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get contacts with enhanced data
    const contacts = await prisma.$queryRaw`
      SELECT 
        c.contactId, c.firstName, c.lastName, c.email, c.phone, c.company,
        c.status, c.score, c.lastContactAt, c.createdAt, c.updatedAt,
        cp.name as campaignName,
        COUNT(cr.id) as totalCalls,
        SUM(CASE WHEN cr.outcome = 'connected' THEN 1 ELSE 0 END) as connectedCalls,
        MAX(cr.startTime) as lastCallTime
      FROM contacts c
      LEFT JOIN campaigns cp ON c.campaignId = cp.campaignId
      LEFT JOIN call_records cr ON c.contactId = cr.contactId
      GROUP BY c.contactId
      ORDER BY c.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];

    // Get total count for pagination
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM contacts c
    ` as any[];
    
    const total = totalResult[0]?.total || 0;

    // Format response
    const formattedContacts = contacts.map(contact => ({
      id: contact.contactId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      status: contact.status,
      score: contact.score,
      lastContactAt: contact.lastContactAt,
      campaignName: contact.campaignName,
      stats: {
        totalCalls: contact.totalCalls || 0,
        connectedCalls: contact.connectedCalls || 0,
        lastCallTime: contact.lastCallTime,
        contactRate: contact.totalCalls > 0 ? 
          Math.round(((contact.connectedCalls || 0) / contact.totalCalls) * 100) : 0
      },
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: formattedContacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch contacts' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/contacts - Create new contact
export const POST = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      company,
      campaignId,
      status = 'new',
      tags = [],
      customFields = {}
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { success: false, message: 'First name, last name, and phone are required' },
        { status: 400 }
      );
    }

    // Check for duplicate contact (same phone in same campaign)
    if (campaignId) {
      const existingContact = await prisma.$queryRaw`
        SELECT contactId FROM contacts 
        WHERE phone = ${phone} AND campaignId = ${campaignId}
        LIMIT 1
      ` as any[];

      if (existingContact.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Contact with this phone number already exists in the campaign' },
          { status: 409 }
        );
      }
    }

    // Create contact
    const contactId = `contact_${Math.random().toString(36).substring(2, 15)}`;
    
    await prisma.$executeRaw`
      INSERT INTO contacts (
        contactId, firstName, lastName, email, phone, company, campaignId,
        status, tags, customFields, createdAt, updatedAt
      ) VALUES (
        ${contactId}, ${firstName}, ${lastName}, ${email || null}, ${phone}, 
        ${company || null}, ${campaignId || null}, ${status}, 
        ${JSON.stringify(tags)}, ${JSON.stringify(customFields)},
        datetime('now'), datetime('now')
      )
    `;

    // Get the created contact
    const newContact = await prisma.$queryRaw`
      SELECT * FROM contacts WHERE contactId = ${contactId} LIMIT 1
    ` as any[];

    return NextResponse.json({
      success: true,
      message: 'Contact created successfully',
      data: {
        ...newContact[0],
        tags: JSON.parse(newContact[0].tags || '[]'),
        customFields: JSON.parse(newContact[0].customFields || '{}')
      }
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create contact' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});