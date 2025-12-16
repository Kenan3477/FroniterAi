import { NextResponse } from 'next/server';

/**
 * GET /api/dispositions
 * Returns the available call dispositions organized by category
 */
export async function GET() {
  // Return the dispositions matching your UI design
  const dispositions = {
    negative: [
      'Cancelled',
      'Do Not Call', 
      'Not Cover And Not Interested',
      'Not Interested - NI',
      'Wrong Number',
      'Deceased',
      'Hostile/Rude'
    ],
    neutral: [
      'Answering Machine',
      'Call Back - CALL ME',
      'Call Transferred',
      'Disconnected',
      'Open Chain',
      'Query',
      'Removed Appliance',
      'No Answer',
      'Busy',
      'Voicemail Left'
    ],
    positive: [
      'Aged Product',
      'Field Payment Save',
      'Live Work',
      'Save',
      'Upload',
      'Sale Made',
      'Appointment Booked',
      'Interest Shown',
      'Information Sent'
    ]
  };

  return NextResponse.json({
    success: true,
    dispositions
  });
}