import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { agentId, status } = await request.json();

    if (!agentId || !status) {
      return NextResponse.json({ error: 'Agent ID and status are required' }, { status: 400 });
    }

    // Valid status values
    const validStatuses = ['Available', 'OnCall', 'AfterCall', 'Break', 'Lunch', 'Meeting', 'Training', 'Offline'];
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Update agent status
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: { 
        currentStatus: status,
        lastLoginAt: new Date(),
        isActive: status !== 'OFFLINE'
      }
    });

    // If agent goes available, check for queued calls
    if (status === 'Available') {
      // Trigger dialer logic (we'll implement this separately)
      // For now, just log that agent is available
      console.log(`Agent ${agentId} is now available for calls`);
    }

    return NextResponse.json({ 
      success: true, 
      agent: updatedAgent,
      message: `Agent status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json({ error: 'Failed to update agent status' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        campaignAgents: {
          where: { priority: { gte: 1 } }, // Use available field instead
          include: {
            campaign: true
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });

  } catch (error) {
    console.error('Error fetching agent status:', error);
    return NextResponse.json({ error: 'Failed to fetch agent status' }, { status: 500 });
  }
}