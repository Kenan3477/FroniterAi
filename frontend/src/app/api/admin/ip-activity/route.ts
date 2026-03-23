/**
 * IP Activity Logging API
 * Tracks activity from whitelisted IPs for Ken to monitor
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface IPActivity {
  id: string;
  ipAddress: string;
  timestamp: Date;
  method: string;
  path: string;
  userAgent?: string;
  userEmail?: string;
  userId?: string;
  responseStatus?: number;
  responseTime?: number;
}

// In-memory storage for IP activity logs (in production, this should be in database)
let ipActivityLogs: IPActivity[] = [];

function isKenTheCreator(email: string): boolean {
  return email === 'ken@simpleemails.co.uk';
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  return request.ip || '127.0.0.1';
}

// Log activity for an IP address
export function logIPActivity(
  ipAddress: string,
  method: string,
  path: string,
  userAgent?: string,
  userEmail?: string,
  userId?: string,
  responseStatus?: number,
  responseTime?: number
) {
  const activityLog: IPActivity = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ipAddress,
    timestamp: new Date(),
    method,
    path,
    userAgent,
    userEmail,
    userId,
    responseStatus,
    responseTime
  };

  ipActivityLogs.unshift(activityLog); // Add to beginning for recent-first order

  // Keep only last 1000 entries to prevent memory issues
  if (ipActivityLogs.length > 1000) {
    ipActivityLogs = ipActivityLogs.slice(0, 1000);
  }

  console.log(`📋 IP Activity logged: ${ipAddress} ${method} ${path}`);
}

// GET - Get IP activity logs (Ken only)
export const GET = requireAuth(async (request, user) => {
  try {
    console.log('📋 IP Activity GET request from user:', user.email);
    
    if (!isKenTheCreator(user.email)) {
      console.log('❌ Access denied - only Ken can view IP activity');
      return NextResponse.json(
        { success: false, error: 'Access denied. Only the creator of Omnivox can view IP activity.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ipAddress = searchParams.get('ip');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredLogs = ipActivityLogs;

    // Filter by IP if specified
    if (ipAddress) {
      filteredLogs = ipActivityLogs.filter(log => log.ipAddress === ipAddress);
    }

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    // Generate activity summary
    const summary = {
      totalLogs: filteredLogs.length,
      uniqueIPs: [...new Set(ipActivityLogs.map(log => log.ipAddress))].length,
      recentActivity: ipActivityLogs.slice(0, 10),
      topPaths: getTopPaths(filteredLogs),
      activityByHour: getActivityByHour(filteredLogs)
    };

    console.log('✅ Returning IP activity data');
    return NextResponse.json({
      success: true,
      data: {
        logs: paginatedLogs,
        summary,
        pagination: {
          total: filteredLogs.length,
          limit,
          offset,
          hasMore: offset + limit < filteredLogs.length
        }
      }
    });

  } catch (error) {
    console.error('❌ IP Activity GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch IP activity' },
      { status: 500 }
    );
  }
});

function getTopPaths(logs: IPActivity[]): { path: string; count: number }[] {
  const pathCounts: { [key: string]: number } = {};
  
  logs.forEach(log => {
    pathCounts[log.path] = (pathCounts[log.path] || 0) + 1;
  });

  return Object.entries(pathCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getActivityByHour(logs: IPActivity[]): { hour: number; count: number }[] {
  const hourCounts: { [key: number]: number } = {};
  
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const result = [];
  for (let i = 0; i < 24; i++) {
    result.push({ hour: i, count: hourCounts[i] || 0 });
  }

  return result;
}

export { ipActivityLogs };