import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Try authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies as fallback
  const cookieStore = cookies();
  const tokenFromCookie = cookieStore.get('auth-token')?.value;
  return tokenFromCookie || null;
}

// GET - Get all agents with coaching data (calls, performance, etc.)
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching agent coaching data from Railway backend');
    
    const authToken = getAuthToken(request);
    if (!authToken) {
      console.log('❌ No auth token found for agent coaching request');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get agents with their current status and performance data
    const agentsResponse = await fetch(`${BACKEND_URL}/api/admin/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!agentsResponse.ok) {
      throw new Error(`Failed to fetch agents: ${agentsResponse.status} ${agentsResponse.statusText}`);
    }

    const agentsData = await agentsResponse.json();
    console.log(`✅ Successfully fetched ${agentsData.data?.agents?.length || 0} agents for coaching`);

    // Get recent call data for coaching metrics
    const callDataResponse = await fetch(`${BACKEND_URL}/api/call-records?limit=100&status=completed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    let callData = null;
    if (callDataResponse.ok) {
      callData = await callDataResponse.json();
      console.log(`✅ Fetched recent call data for coaching analysis`);
    } else {
      console.log(`⚠️ Could not fetch call data: ${callDataResponse.status}`);
    }

    // Enhance agent data with coaching metrics
    const enhancedAgents = (agentsData.data?.agents || []).map((agent: any) => {
      // Calculate coaching metrics from call data
      const agentCalls = callData?.data?.callRecords?.filter((call: any) => call.agentId === agent.id) || [];
      
      const totalCalls = agentCalls.length;
      const totalDuration = agentCalls.reduce((sum: number, call: any) => sum + (call.duration || 0), 0);
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      
      // Calculate conversion rate from call dispositions (if available)
      const successfulCalls = agentCalls.filter((call: any) => 
        call.disposition && ['sale', 'appointment', 'interested', 'callback'].includes(call.disposition.toLowerCase())
      ).length;
      const conversionRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;
      
      // Calculate talk time percentage (assuming 8 hour work day = 28800 seconds)
      const workDaySeconds = 28800;
      const talkTimePercent = totalDuration > 0 ? Math.round((totalDuration / workDaySeconds) * 100) : 0;

      return {
        ...agent,
        // Coaching-specific metrics
        coaching: {
          totalCalls: totalCalls,
          avgTalkTime: avgDuration,
          conversionRate: conversionRate,
          satisfaction: 0, // ⚠️ NOT IMPLEMENTED: Customer satisfaction surveys not available
          talkTimePercent: Math.min(talkTimePercent, 100), // Cap at 100%
          lastCall: agentCalls.length > 0 ? agentCalls[agentCalls.length - 1].createdAt : null,
          performance: {
            callsToday: agentCalls.filter((call: any) => {
              const callDate = new Date(call.createdAt).toDateString();
              const today = new Date().toDateString();
              return callDate === today;
            }).length,
            avgCallDuration: avgDuration,
            totalTalkTime: totalDuration
          }
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        agents: enhancedAgents,
        totalAgents: enhancedAgents.length,
        onlineAgents: enhancedAgents.filter((agent: any) => agent.status === 'Online').length,
        activeAgents: enhancedAgents.filter((agent: any) => 
          agent.status === 'Online' && agent.coaching?.totalCalls > 0
        ).length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching agent coaching data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch agent coaching data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}