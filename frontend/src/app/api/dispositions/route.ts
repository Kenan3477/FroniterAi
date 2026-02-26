import { NextResponse } from 'next/server';

/**
 * GET /api/dispositions
 * Proxy to backend dispositions/configs endpoint to get real database dispositions
 */
export async function GET() {
  try {
    // Get real database dispositions from backend
    const backendUrl = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';
    const response = await fetch(`${backendUrl}/api/dispositions/configs`, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_KEY || 'system-token'}`,
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      console.log('Backend dispositions unavailable, falling back to static list');
    }
  } catch (error) {
    console.log('Failed to fetch backend dispositions, using fallback:', error);
  }

  // Fallback to static dispositions if backend is unavailable
  const fallbackDispositions = {
    negative: [
      { id: 'fallback-1', name: 'Cancelled', category: 'negative' },
      { id: 'fallback-2', name: 'Do Not Call', category: 'negative' },
      { id: 'fallback-3', name: 'Not Interested - NI', category: 'negative' },
      { id: 'fallback-4', name: 'Wrong Number', category: 'negative' },
      { id: 'fallback-5', name: 'Deceased', category: 'negative' },
      { id: 'fallback-6', name: 'Hostile/Rude', category: 'negative' }
    ],
    neutral: [
      { id: 'fallback-7', name: 'Answering Machine', category: 'neutral' },
      { id: 'fallback-8', name: 'Call Back - CALL ME', category: 'neutral' },
      { id: 'fallback-9', name: 'Disconnected', category: 'neutral' },
      { id: 'fallback-10', name: 'No Answer', category: 'neutral' },
      { id: 'fallback-11', name: 'Busy', category: 'neutral' },
      { id: 'fallback-12', name: 'Voicemail Left', category: 'neutral' }
    ],
    positive: [
      { id: 'fallback-13', name: 'Connected', category: 'positive' },
      { id: 'fallback-14', name: 'Sale Made', category: 'positive' },
      { id: 'fallback-15', name: 'Appointment Booked', category: 'positive' },
      { id: 'fallback-16', name: 'Interest Shown', category: 'positive' },
      { id: 'fallback-17', name: 'Information Sent', category: 'positive' }
    ]
  };

  return NextResponse.json({
    success: true,
    dispositions: fallbackDispositions,
    fallback: true
  });
}