import { NextRequest, NextResponse } from 'next/server';

// In-memory agent status storage (in production, use database/Redis)
let agentStatuses = new Map([
  ['agent-1', { id: 'agent-1', name: 'Agent User', status: 'offline', sipRegistered: false, lastUpdate: new Date().toISOString() }]
]);

export async function GET(request: NextRequest) {
  try {
    const agents = Array.from(agentStatuses.values());
    
    return NextResponse.json({
      success: true,
      data: {
        agents,
        summary: {
          total: agents.length,
          available: agents.filter(a => a.status === 'available').length,
          busy: agents.filter(a => a.status === 'busy').length,
          offline: agents.filter(a => a.status === 'offline').length
        }
      }
    });
  } catch (error) {
    console.error('Agent queue error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, status, sipRegistered } = body;

    if (!agentId || !status) {
      return NextResponse.json(
        { success: false, error: 'Agent ID and status required' },
        { status: 400 }
      );
    }

    // Update agent status
    const existingAgent = agentStatuses.get(agentId) || { 
      id: agentId, 
      name: `Agent ${agentId}`, 
      status: 'offline', 
      sipRegistered: false 
    };

    agentStatuses.set(agentId, {
      ...existingAgent,
      status,
      sipRegistered: sipRegistered ?? existingAgent.sipRegistered,
      lastUpdate: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: agentStatuses.get(agentId)
    });
  } catch (error) {
    console.error('Agent status update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent status' },
      { status: 500 }
    );
  }
}