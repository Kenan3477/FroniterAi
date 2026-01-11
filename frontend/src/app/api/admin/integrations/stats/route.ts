import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock auth for build time
const requireRole = (roles: string[]) => (handler: (request: NextRequest, user: any) => Promise<any>) => async (request: NextRequest) => {
  // During build time, return mock response
  if (process.env.NODE_ENV === 'development' || !process.env.JWT_SECRET) {
    return NextResponse.json({ 
      success: false, 
      error: 'Environment not configured',
      data: {}
    });
  }
  
  // In production, implement actual auth
  return handler(request, { id: 1, role: 'ADMIN' });
};

export const GET = requireRole(['ADMIN', 'SUPERVISOR'])(async (request, user) => {
  try {
    // Get integration statistics
    const integrationStats = await prisma.$queryRaw`
      SELECT 
        syncStatus as status,
        COUNT(*) as count
      FROM integrations
      WHERE isActive = 1
      GROUP BY syncStatus
    ` as any[];

    // Get webhook statistics
    const webhookStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalWebhooks,
        SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeWebhooks
      FROM webhooks
    ` as any[];

    // Get recent webhook deliveries
    const deliveryStats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM webhook_deliveries
      WHERE createdAt >= datetime('now', '-24 hours')
      GROUP BY status
    ` as any[];

    // Get integration sync logs from last 24 hours
    const syncLogs = await prisma.$queryRaw`
      SELECT 
        i.name as integrationName,
        COUNT(*) as totalSyncs,
        SUM(CASE WHEN il.status = 'success' THEN 1 ELSE 0 END) as successfulSyncs,
        SUM(CASE WHEN il.status = 'error' THEN 1 ELSE 0 END) as failedSyncs,
        AVG(il.duration) as avgDuration,
        SUM(il.recordsProcessed) as totalRecordsProcessed
      FROM integration_logs il
      INNER JOIN integrations i ON il.integrationId = i.id
      WHERE il.timestamp >= datetime('now', '-24 hours')
      GROUP BY il.integrationId, i.name
    ` as any[];

    // Format the response
    const stats = {
      integrations: {
        total: integrationStats.reduce((sum, stat) => sum + stat.count, 0),
        byStatus: integrationStats.reduce((acc, stat) => {
          acc[stat.status] = stat.count;
          return acc;
        }, {})
      },
      webhooks: {
        total: webhookStats[0]?.totalWebhooks || 0,
        active: webhookStats[0]?.activeWebhooks || 0
      },
      deliveries: {
        last24Hours: deliveryStats.reduce((acc, stat) => {
          acc[stat.status] = stat.count;
          return acc;
        }, {})
      },
      syncPerformance: syncLogs
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching integration stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch integration stats' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});