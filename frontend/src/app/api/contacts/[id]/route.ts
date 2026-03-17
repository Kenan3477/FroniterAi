import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/contacts/[id] - Get single contact
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (req, user) => {
    try {
      const contactId = params.id;

      // Build query with access control
      let accessCondition = '';
      const queryParams: any[] = [contactId];

      if (user.role === 'AGENT') {
        accessCondition = `AND EXISTS (
          SELECT 1 FROM agent_campaign_assignments aca 
          WHERE aca.agentId = ? 
            AND aca.campaignId = c.campaignId
            AND aca.isActive = true
        )`;
        queryParams.push(user.userId.toString());
      }

      const contact = await prisma.$queryRaw`
        SELECT 
          c.contactId, c.firstName, c.lastName, c.email, c.phone, c.company,
          c.status, c.score, c.tags, c.customFields, c.lastContactAt, 
          c.createdAt, c.updatedAt, c.campaignId,
          cp.name as campaignName
        FROM contacts c
        LEFT JOIN campaigns cp ON c.campaignId = cp.campaignId
        WHERE c.contactId = ${contactId} ${accessCondition}
        LIMIT 1
      ` as any[];

      if (contact.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Contact not found' },
          { status: 404 }
        );
      }

      // Get contact interaction history
      const interactions = await prisma.$queryRaw`
        SELECT 
          cr.id, cr.callId, cr.startTime, cr.endTime, cr.duration,
          cr.outcome, cr.notes, cr.recording,
          d.name as dispositionName,
          a.firstName as agentFirstName, a.lastName as agentLastName
        FROM call_records cr
        LEFT JOIN dispositions d ON cr.dispositionId = d.id
        LEFT JOIN agents a ON cr.agentId = a.agentId
        WHERE cr.contactId = ${contactId}
        ORDER BY cr.startTime DESC
        LIMIT 20
      ` as any[];

      // Format response
      const contactData = {
        ...contact[0],
        tags: JSON.parse(contact[0].tags || '[]'),
        customFields: JSON.parse(contact[0].customFields || '{}'),
        fullName: `${contact[0].firstName} ${contact[0].lastName}`,
        interactions: interactions.map(interaction => ({
          ...interaction,
          agentName: interaction.agentFirstName 
            ? `${interaction.agentFirstName} ${interaction.agentLastName}`
            : null
        }))
      };

      return NextResponse.json({
        success: true,
        data: contactData
      });

    } catch (error) {
      console.error('Error fetching contact:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch contact' },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  })(request);
}

// PUT /api/contacts/[id] - Update contact
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (req, user) => {
    try {
      const contactId = params.id;
      const body = await request.json();
      
      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        company,
        status,
        tags,
        customFields,
        notes
      } = body;

      // Check if contact exists and user has access
      let accessCondition = '';
      if (user.role === 'AGENT') {
        accessCondition = `AND EXISTS (
          SELECT 1 FROM agent_campaign_assignments aca 
          WHERE aca.agentId = '${user.userId}' 
            AND aca.campaignId = c.campaignId
            AND aca.isActive = true
        )`;
      }

      const existingContact = await prisma.$queryRaw`
        SELECT contactId FROM contacts c
        WHERE contactId = ${contactId} ${accessCondition}
        LIMIT 1
      ` as any[];

      if (existingContact.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Contact not found or access denied' },
          { status: 404 }
        );
      }

      // Update contact
      const updateFields = [];
      const updateParams: any[] = [];

      if (firstName) {
        updateFields.push('firstName = ?');
        updateParams.push(firstName);
      }
      if (lastName) {
        updateFields.push('lastName = ?');
        updateParams.push(lastName);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateParams.push(email);
      }
      if (phone) {
        updateFields.push('phone = ?');
        updateParams.push(phone);
      }
      if (company !== undefined) {
        updateFields.push('company = ?');
        updateParams.push(company);
      }
      if (status) {
        updateFields.push('status = ?');
        updateParams.push(status);
      }
      if (tags) {
        updateFields.push('tags = ?');
        updateParams.push(JSON.stringify(tags));
      }
      if (customFields) {
        updateFields.push('customFields = ?');
        updateParams.push(JSON.stringify(customFields));
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateParams.push(notes);
      }

      updateFields.push('updatedAt = NOW()');
      updateParams.push(contactId);

      if (updateFields.length > 1) { // More than just updatedAt
        await prisma.$executeRaw`
          UPDATE contacts 
          SET ${updateFields.join(', ')}
          WHERE contactId = ?
        `;
      }

      // Get updated contact
      const updatedContact = await prisma.$queryRaw`
        SELECT * FROM contacts WHERE contactId = ${contactId} LIMIT 1
      ` as any[];

      return NextResponse.json({
        success: true,
        message: 'Contact updated successfully',
        data: {
          ...updatedContact[0],
          tags: JSON.parse(updatedContact[0].tags || '[]'),
          customFields: JSON.parse(updatedContact[0].customFields || '{}')
        }
      });

    } catch (error) {
      console.error('Error updating contact:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update contact' },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  })(request);
}

// DELETE /api/contacts/[id] - Delete contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (req, user) => {
    try {
      const contactId = params.id;
      console.log(`🗑️ Deleting contact with ID: ${contactId}`);

      // Get auth token from the request header (already validated by requireAuth)
      const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

      if (!authToken) {
        return NextResponse.json({
          success: false,
          error: {
            message: 'Authentication token not found',
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
            message: `Contact deletion failed: ${response.status} ${response.statusText}`,
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
    } finally {
      await prisma.$disconnect();
    }
  })(request);
}