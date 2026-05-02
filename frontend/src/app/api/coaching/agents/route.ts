import { NextRequest, NextResponse } from 'next/server';
import { getBearerFromNextRequest } from '@/lib/serverAuthBearer';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Fetching live agents for coaching...');

    const authToken = getBearerFromNextRequest(request);
    
    if (!authToken) {
      console.log('🔒 No auth token - using demo coaching data');
      return NextResponse.json({
        success: true,
        data: {
          agents: [],
          message: 'Authentication required for live agent data'
        }
      });
    }

    // Fetch live agents from backend
    const agentsResponse = await fetch(`${BACKEND_URL}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!agentsResponse.ok) {
      throw new Error(`Backend agents API failed: ${agentsResponse.status}`);
    }

    const agentsData = await agentsResponse.json();
    console.log('📊 Backend agents data:', agentsData);

    // Transform agents for coaching interface
    const coachingAgents = agentsData.data?.map((agent: any) => ({
      agentId: agent.agentId || agent.id,
      id: agent.agentId || agent.id,
      firstName: agent.firstName || '',
      lastName: agent.lastName || '',
      username: agent.username || `Agent ${agent.id}`,
      status: agent.status || 'Offline',
      isLoggedIn: agent.isLoggedIn || false,
      extension: agent.extension,
      currentCall: agent.currentCall ? {
        callId: agent.currentCall.callId,
        contactId: agent.currentCall.contactId,
        contactName: agent.currentCall.contact?.firstName || 'Unknown Contact',
        contactPhone: agent.currentCall.contact?.phone || '',
        startTime: agent.currentCall.startTime,
        callType: agent.currentCall.callType || 'outbound'
      } : null,
      stats: {
        callsToday: agent.callsToday || 0,
        avgCallTime: agent.avgCallTime || 0,
        conversionRate: agent.conversionRate || 0,
        satisfaction: agent.satisfaction || 0
      }
    })) || [];

    // Filter to only online/available agents for coaching
    const activeAgents = coachingAgents.filter((agent: any) => 
      agent.isLoggedIn && agent.status !== 'Offline'
    );

    console.log(`✅ Found ${activeAgents.length} active agents for coaching`);

    return NextResponse.json({
      success: true,
      data: {
        agents: activeAgents,
        totalAgents: coachingAgents.length,
        activeAgents: activeAgents.length,
        onCallAgents: activeAgents.filter((a: any) => a.currentCall).length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching coaching agents:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live agent data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}