import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Save Call Data API
 * POST /api/calls/save-call-data
 * Saves customer info and call disposition after call ends
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      customerInfo,
      disposition,
      callDuration,
      agentId,
      campaignId
    } = body;

    console.log('💾 Saving call data for:', phoneNumber);

    try {
      // Find or create contact
      let contact = await (db as any).contact.findFirst({
        where: {
          OR: [
            { phone: phoneNumber },
            { phone: phoneNumber.replace(/\s+/g, '') },
            { mobile: phoneNumber },
            { mobile: phoneNumber.replace(/\s+/g, '') }
          ]
        }
      });

      if (!contact && customerInfo) {
        // Create new contact
        contact = await (db as any).contact.create({
          data: {
            contactId: `CONT-${Date.now()}`,
            listId: 'manual-dial',
            firstName: customerInfo.firstName || '',
            lastName: customerInfo.lastName || '',
            phone: phoneNumber,
            email: customerInfo.email || null,
            address: customerInfo.address || null,
            notes: customerInfo.notes || null,
            status: 'contacted'
          }
        });
        console.log('✅ New contact created:', contact.id);
      } else if (contact && customerInfo) {
        // Update existing contact
        contact = await (db as any).contact.update({
          where: { id: contact.id },
          data: {
            firstName: customerInfo.firstName || contact.firstName,
            lastName: customerInfo.lastName || contact.lastName,
            email: customerInfo.email || contact.email,
            address: customerInfo.address || contact.address,
            notes: customerInfo.notes || contact.notes
          }
        });
        console.log('✅ Contact updated:', contact.id);
      }

      // Create interaction record
      const interaction = await (db as any).interaction.create({
        data: {
          interactionId: `INT-${Date.now()}`,
          contactId: contact?.id || 'unknown',
          agentId: agentId || 'unknown',
          campaignId: campaignId || 'manual-dial',
          type: 'call',
          direction: 'outbound',
          status: 'completed',
          duration: callDuration || 0,
          outcome: disposition?.outcome || 'unknown',
          notes: disposition?.notes || null,
          startTime: new Date(),
          endTime: new Date()
        }
      });

      console.log('✅ Interaction saved:', interaction.id);

      return NextResponse.json({
        success: true,
        contact,
        interaction
      });
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('❌ Save call data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
