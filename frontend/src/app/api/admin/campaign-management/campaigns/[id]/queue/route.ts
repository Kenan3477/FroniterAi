import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 Frontend: Simulating queue fetch for campaign ${params.id}`);
    
    // Simulate queue data
    const mockQueueData = {
      success: true,
      data: {
        campaignId: params.id,
        queue: [
          {
            id: 'queue_1',
            queueId: 'q_001',
            contactName: 'John Doe',
            contactPhone: '+1234567890',
            status: 'PENDING',
            priority: 1,
            scheduledTime: new Date().toISOString()
          },
          {
            id: 'queue_2', 
            queueId: 'q_002',
            contactName: 'Jane Smith',
            contactPhone: '+1234567891',
            status: 'PENDING',
            priority: 2,
            scheduledTime: new Date().toISOString()
          }
        ],
        total: 2
      }
    };
    
    console.log(`✅ Queue data simulated for campaign ${params.id}`);
    return NextResponse.json(mockQueueData);
  } catch (error) {
    console.error('❌ Error simulating queue fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign queue' },
      { status: 500 }
    );
  }
}