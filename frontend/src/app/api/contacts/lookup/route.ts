import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Customer Lookup API
 * GET /api/contacts/lookup?phoneNumber=+447700900123
 * Returns customer information if found in database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking up customer by phone:', phoneNumber);

    // Search for contact by phone number
    const contact = await (db as any).contact.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { phone: phoneNumber.replace(/\s+/g, '') },
          { phone: phoneNumber.replace(/[\s-()]/g, '') },
          { mobile: phoneNumber },
          { mobile: phoneNumber.replace(/\s+/g, '') }
        ]
      },
      select: {
        id: true,
        contactId: true,
        firstName: true,
        lastName: true,
        phone: true,
        mobile: true,
        email: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        notes: true
      }
    });

    if (!contact) {
      console.log('❌ No customer found for:', phoneNumber);
      return NextResponse.json(null, { status: 404 });
    }

    console.log('✅ Customer found:', contact.id);
    return NextResponse.json(contact);
  } catch (error) {
    console.error('❌ Customer lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
