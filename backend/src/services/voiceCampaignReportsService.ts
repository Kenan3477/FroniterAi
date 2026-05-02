/**
 * Voice campaign analytics from call_records (aligned with dashboard sale/connection logic).
 */

import { formatInTimeZone } from 'date-fns-tz';
import { prisma } from '../database/index';
import { getDashboardStatsTimezone } from '../utils/dashboardDayBounds';
import { isStatsConnectedCall, isStatsSaleOnly } from '../utils/dashboardCallMetrics';

export interface VoiceCampaignFilters {
  campaignId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  agentIds?: string[];
  leadListIds?: string[];
}

export interface VoiceCampaignKPIs {
  totalCalls: number;
  connectedCalls: number;
  answerRate: number;
  conversionRate: number;
  averageCallDuration: number;
  revenuePerCampaign: number;
  costPerConversion: number;
}

export interface CallsByHourData {
  hour: number;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
}

export interface CallsByAgentData {
  agentId: string;
  agentName: string;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
}

export interface ConversionFunnelData {
  totalCalls: number;
  connectedCalls: number;
  qualifiedLeads: number;
  conversions: number;
}

export interface CallOutcomeData {
  outcome: string;
  count: number;
  percentage: number;
}

const MAX_ROWS = 80_000;

function buildWhere(filters: VoiceCampaignFilters): Record<string, unknown> {
  const { campaignId, dateFrom, dateTo, agentIds, leadListIds } = filters;
  const where: Record<string, unknown> = {};

  if (campaignId) {
    where.campaignId = campaignId;
  }

  if (dateFrom || dateTo) {
    where.startTime = {};
    if (dateFrom) (where.startTime as any).gte = dateFrom;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.startTime as any).lte = end;
    }
  }

  if (agentIds && agentIds.length > 0) {
    where.agentId = { in: agentIds };
  }

  if (leadListIds && leadListIds.length > 0) {
    where.contact = { listId: { in: leadListIds } };
  }

  return where;
}

export async function getVoiceCampaignAnalytics(filters: VoiceCampaignFilters = {}) {
  try {
    const whereClause = buildWhere(filters);
    const tz = getDashboardStatsTimezone();

    const rows = await prisma.callRecord.findMany({
      where: whereClause as any,
      take: MAX_ROWS,
      orderBy: { startTime: 'desc' },
      select: {
        startTime: true,
        endTime: true,
        duration: true,
        outcome: true,
        dispositionId: true,
        agentId: true,
        disposition: { select: { name: true } },
      },
    });

    let totalCalls = 0;
    let connectedCalls = 0;
    let conversions = 0;
    let durationSum = 0;
    let durationCount = 0;

    const hourBuckets: CallsByHourData[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      totalCalls: 0,
      connectedCalls: 0,
      conversions: 0,
    }));

    const agentMap = new Map<
      string,
      { total: number; connected: number; conversions: number }
    >();

    const outcomeMap = new Map<string, number>();

    for (const r of rows) {
      totalCalls += 1;

      const dispName = r.disposition?.name ?? null;
      const connected = isStatsConnectedCall({
        endTime: r.endTime,
        outcome: r.outcome,
        duration: r.duration,
        dispositionId: r.dispositionId,
      });
      const sale = isStatsSaleOnly({ outcome: r.outcome, dispositionName: dispName });

      if (connected) connectedCalls += 1;
      if (sale) conversions += 1;

      if (r.duration != null && r.duration > 0 && r.endTime) {
        durationSum += r.duration;
        durationCount += 1;
      }

      const hourStr = formatInTimeZone(new Date(r.startTime), tz, 'H');
      const hour = Math.min(23, Math.max(0, parseInt(hourStr, 10) || 0));
      hourBuckets[hour].totalCalls += 1;
      if (connected) hourBuckets[hour].connectedCalls += 1;
      if (sale) hourBuckets[hour].conversions += 1;

      const aid = r.agentId || 'unassigned';
      if (!agentMap.has(aid)) {
        agentMap.set(aid, { total: 0, connected: 0, conversions: 0 });
      }
      const ag = agentMap.get(aid)!;
      ag.total += 1;
      if (connected) ag.connected += 1;
      if (sale) ag.conversions += 1;

      const oc = (r.outcome || 'unknown').trim() || 'unknown';
      outcomeMap.set(oc, (outcomeMap.get(oc) || 0) + 1);
    }

    const answerRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;
    const conversionRate = connectedCalls > 0 ? (conversions / connectedCalls) * 100 : 0;
    const averageCallDuration = durationCount > 0 ? Math.round(durationSum / durationCount) : 0;

    // Qualified leads: connected + at least 30s talk time
    let qualifiedLeads = 0;
    for (const r of rows) {
      const connected = isStatsConnectedCall({
        endTime: r.endTime,
        outcome: r.outcome,
        duration: r.duration,
        dispositionId: r.dispositionId,
      });
      if (connected && (r.duration ?? 0) >= 30) qualifiedLeads += 1;
    }

    const agentIdsList = [...agentMap.keys()].filter((id) => id !== 'unassigned');
    const agents =
      agentIdsList.length > 0
        ? await prisma.agent.findMany({
            where: { agentId: { in: agentIdsList } },
            select: { agentId: true, firstName: true, lastName: true },
          })
        : [];
    const agentNameById = new Map(
      agents.map((a) => [a.agentId, `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.agentId]),
    );

    const callsByAgent: CallsByAgentData[] = [...agentMap.entries()]
      .map(([agentId, v]) => ({
        agentId,
        agentName: agentNameById.get(agentId) || (agentId === 'unassigned' ? 'Unassigned' : agentId),
        totalCalls: v.total,
        connectedCalls: v.connected,
        conversions: v.conversions,
      }))
      .sort((a, b) => b.totalCalls - a.totalCalls);

    const totalForPct = rows.length;
    const callOutcomes: CallOutcomeData[] = [...outcomeMap.entries()]
      .map(([outcome, count]) => ({
        outcome,
        count,
        percentage: totalForPct > 0 ? Math.round((count / totalForPct) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const kpis: VoiceCampaignKPIs = {
      totalCalls,
      connectedCalls,
      answerRate: Math.round(answerRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageCallDuration,
      revenuePerCampaign: 0,
      costPerConversion: 0,
    };

    return {
      success: true,
      data: {
        kpis,
        charts: {
          callsByHour: hourBuckets,
          callsByAgent,
          conversionFunnel: {
            totalCalls,
            connectedCalls,
            qualifiedLeads,
            conversions,
          },
          callOutcomes,
        },
        meta: {
          rowCap: MAX_ROWS,
          rowsUsed: rows.length,
          timezone: tz,
          truncated: rows.length >= MAX_ROWS,
        },
      },
    };
  } catch (error) {
    console.error('Error getting voice campaign analytics:', error);
    return {
      success: false,
      error: 'Failed to retrieve campaign analytics',
    };
  }
}

export async function getVoiceCampaignFiltersData() {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        callRecords: { some: {} },
      },
      select: {
        campaignId: true,
        name: true,
        _count: { select: { callRecords: true } },
      },
      orderBy: { name: 'asc' },
    });

    const agents = await prisma.agent.findMany({
      where: {
        callRecords: { some: {} },
      },
      select: {
        agentId: true,
        firstName: true,
        lastName: true,
        _count: { select: { callRecords: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const leadLists = await prisma.dataList.findMany({
      where: {
        contacts: {
          some: {
            callRecords: { some: {} },
          },
        },
      },
      select: {
        listId: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: {
        campaigns: campaigns.map((c) => ({
          campaignId: c.campaignId,
          name: c.name,
          callCount: c._count.callRecords,
        })),
        agents: agents.map((agent) => ({
          agentId: agent.agentId,
          name: `${agent.firstName} ${agent.lastName}`.trim() || agent.agentId,
          callCount: agent._count.callRecords,
        })),
        leadLists: leadLists.map((l) => ({
          listId: l.listId,
          name: l.name,
        })),
      },
    };
  } catch (error) {
    console.error('Error getting filter data:', error);
    return {
      success: false,
      error: 'Failed to retrieve filter data',
    };
  }
}
