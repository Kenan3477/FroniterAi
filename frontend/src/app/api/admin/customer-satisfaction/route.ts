import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const cookieStore = cookies();
  const tokenFromCookie = cookieStore.get('auth-token')?.value;
  return tokenFromCookie || null;
}

// GET - Get customer satisfaction surveys and ratings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const callId = searchParams.get('callId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('📊 Fetching customer satisfaction data:', { agentId, callId, startDate, endDate });
    
    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query parameters for backend
    const queryParams = new URLSearchParams();
    if (agentId) queryParams.append('agentId', agentId);
    if (callId) queryParams.append('callId', callId);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    queryParams.append('limit', '1000');

    // Fetch call records with customer feedback
    const callRecordsResponse = await fetch(
      `${BACKEND_URL}/api/call-records?${queryParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    let callRecords = [];
    if (callRecordsResponse.ok) {
      const callData = await callRecordsResponse.json();
      callRecords = callData.data?.callRecords || [];
    }

    // Process satisfaction data from call records
    const satisfactionData = processSatisfactionData(callRecords, agentId);

    console.log('✅ Customer satisfaction data processed successfully');

    return NextResponse.json({
      success: true,
      data: satisfactionData
    });

  } catch (error) {
    console.error('❌ Error fetching satisfaction data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customer satisfaction data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST - Submit customer satisfaction survey response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, rating, feedback, surveyResponses } = body;

    console.log('📝 Submitting customer satisfaction survey:', { callId, rating, feedback });
    
    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Submit satisfaction data to backend
    const response = await fetch(`${BACKEND_URL}/api/customer-satisfaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        callId,
        rating: parseInt(rating),
        feedback: feedback || '',
        surveyResponses: surveyResponses || {},
        submittedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Customer satisfaction survey submitted successfully');

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Customer satisfaction survey submitted successfully'
    });

  } catch (error) {
    console.error('❌ Error submitting satisfaction survey:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit customer satisfaction survey', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Process satisfaction data from call records
function processSatisfactionData(callRecords: any[], agentId?: string | null) {
  // Filter call records that have satisfaction data
  const callsWithSatisfaction = callRecords.filter(call => 
    call.customerSatisfaction && call.customerSatisfaction.rating
  );

  // Calculate overall satisfaction metrics
  const totalSurveys = callsWithSatisfaction.length;
  const avgRating = totalSurveys > 0 
    ? callsWithSatisfaction.reduce((sum, call) => sum + call.customerSatisfaction.rating, 0) / totalSurveys 
    : 0;

  // Rating distribution
  const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  callsWithSatisfaction.forEach(call => {
    const rating = call.customerSatisfaction.rating;
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating as keyof typeof ratingDistribution]++;
    }
  });

  // Recent satisfaction surveys
  const recentSurveys = callsWithSatisfaction
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map(call => ({
      id: call.id,
      callId: call.id,
      agentName: call.agentName || 'Unknown Agent',
      customerPhone: call.phoneNumber || 'Unknown',
      rating: call.customerSatisfaction.rating,
      feedback: call.customerSatisfaction.feedback || '',
      submittedAt: call.customerSatisfaction.submittedAt || call.createdAt,
      callDuration: call.duration || 0
    }));

  // Agent-specific metrics if agentId provided
  let agentMetrics = null;
  if (agentId) {
    const agentCalls = callsWithSatisfaction.filter(call => call.agentId === agentId);
    const agentTotalSurveys = agentCalls.length;
    const agentAvgRating = agentTotalSurveys > 0
      ? agentCalls.reduce((sum, call) => sum + call.customerSatisfaction.rating, 0) / agentTotalSurveys
      : 0;

    agentMetrics = {
      totalSurveys: agentTotalSurveys,
      averageRating: Math.round(agentAvgRating * 10) / 10,
      satisfactionTrend: calculateSatisfactionTrend(agentCalls),
      recentSurveys: agentCalls.slice(0, 10).map(call => ({
        callId: call.id,
        rating: call.customerSatisfaction.rating,
        feedback: call.customerSatisfaction.feedback || '',
        submittedAt: call.customerSatisfaction.submittedAt || call.createdAt
      }))
    };
  }

  return {
    overview: {
      totalSurveys,
      averageRating: Math.round(avgRating * 10) / 10,
      satisfactionRate: totalSurveys > 0 ? Math.round((callsWithSatisfaction.filter(call => 
        call.customerSatisfaction.rating >= 4
      ).length / totalSurveys) * 100) : 0,
      responseRate: callRecords.length > 0 ? Math.round((totalSurveys / callRecords.length) * 100) : 0
    },
    ratingDistribution,
    recentSurveys,
    agentMetrics,
    generatedAt: new Date().toISOString()
  };
}

// Calculate satisfaction trend over time
function calculateSatisfactionTrend(calls: any[]) {
  if (calls.length < 2) return 0;

  const sortedCalls = calls.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const midpoint = Math.floor(sortedCalls.length / 2);
  const firstHalf = sortedCalls.slice(0, midpoint);
  const secondHalf = sortedCalls.slice(midpoint);

  const firstHalfAvg = firstHalf.reduce((sum, call) => sum + call.customerSatisfaction.rating, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, call) => sum + call.customerSatisfaction.rating, 0) / secondHalf.length;

  return Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10;
}