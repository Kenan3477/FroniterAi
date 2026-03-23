/**
 * IP Whitelist Management API
 * Only accessible by Ken (ken@simpleemails.co.uk) - Creator of Omnivox
 * Manages IP addresses that are allowed to access the system
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface IPWhitelistEntry {
  id: string;
  ipAddress: string;
  name: string;
  description?: string;
  addedBy: string;
  addedAt: Date;
  lastActivity?: Date;
  isActive: boolean;
  activityCount: number;
}

// In-memory storage for now (in production, this should be in database)
let ipWhitelist: IPWhitelistEntry[] = [
  {
    id: 'default-localhost',
    ipAddress: '127.0.0.1',
    name: 'Localhost',
    description: 'Local development access',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'default-localhost-ipv6',
    ipAddress: '::1',
    name: 'Localhost IPv6',
    description: 'Local development access (IPv6)',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  }
];

function isKenTheCreator(email: string): boolean {
  return email === 'ken@simpleemails.co.uk';
}

function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  // Fallback to request IP (may be from load balancer)
  return request.ip || '127.0.0.1';
}

function updateIPActivity(ipAddress: string) {
  const entry = ipWhitelist.find(item => item.ipAddress === ipAddress);
  if (entry) {
    entry.lastActivity = new Date();
    entry.activityCount += 1;
  }
}

// GET - List all whitelisted IPs (Ken only)
export const GET = requireAuth(async (request, user) => {
  try {
    console.log('🔒 IP Whitelist GET request from user:', user.email);
    
    if (!isKenTheCreator(user.email)) {
      console.log('❌ Access denied - only Ken can access IP whitelist');
      return NextResponse.json(
        { success: false, error: 'Access denied. Only the creator of Omnivox can manage IP whitelists.' },
        { status: 403 }
      );
    }

    // Update activity for current request
    const currentIP = getClientIP(request);
    updateIPActivity(currentIP);

    console.log('✅ Returning IP whitelist data');
    return NextResponse.json({
      success: true,
      data: {
        whitelist: ipWhitelist,
        currentIP: currentIP,
        totalEntries: ipWhitelist.length,
        activeEntries: ipWhitelist.filter(item => item.isActive).length
      }
    });

  } catch (error) {
    console.error('❌ IP Whitelist GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch IP whitelist' },
      { status: 500 }
    );
  }
});

// POST - Add new IP to whitelist (Ken only)
export const POST = requireAuth(async (request, user) => {
  try {
    console.log('🔒 IP Whitelist POST request from user:', user.email);
    
    if (!isKenTheCreator(user.email)) {
      console.log('❌ Access denied - only Ken can add IPs to whitelist');
      return NextResponse.json(
        { success: false, error: 'Access denied. Only the creator of Omnivox can manage IP whitelists.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ipAddress, name, description } = body;

    // Validate required fields
    if (!ipAddress || !name) {
      return NextResponse.json(
        { success: false, error: 'IP address and name are required' },
        { status: 400 }
      );
    }

    // Check if IP already exists
    const existingEntry = ipWhitelist.find(item => item.ipAddress === ipAddress);
    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: 'IP address is already whitelisted' },
        { status: 409 }
      );
    }

    // Create new whitelist entry
    const newEntry: IPWhitelistEntry = {
      id: `ip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ipAddress,
      name,
      description: description || '',
      addedBy: user.email,
      addedAt: new Date(),
      isActive: true,
      activityCount: 0
    };

    ipWhitelist.push(newEntry);

    console.log(`✅ Added IP ${ipAddress} (${name}) to whitelist`);
    return NextResponse.json({
      success: true,
      message: 'IP address successfully added to whitelist',
      data: newEntry
    });

  } catch (error) {
    console.error('❌ IP Whitelist POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add IP to whitelist' },
      { status: 500 }
    );
  }
});

// DELETE - Remove IP from whitelist (Ken only)
export const DELETE = requireAuth(async (request, user) => {
  try {
    console.log('🔒 IP Whitelist DELETE request from user:', user.email);
    
    if (!isKenTheCreator(user.email)) {
      console.log('❌ Access denied - only Ken can remove IPs from whitelist');
      return NextResponse.json(
        { success: false, error: 'Access denied. Only the creator of Omnivox can manage IP whitelists.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ipId = searchParams.get('id');

    if (!ipId) {
      return NextResponse.json(
        { success: false, error: 'IP ID is required' },
        { status: 400 }
      );
    }

    const entryIndex = ipWhitelist.findIndex(item => item.id === ipId);
    if (entryIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'IP address not found in whitelist' },
        { status: 404 }
      );
    }

    const removedEntry = ipWhitelist[entryIndex];
    ipWhitelist.splice(entryIndex, 1);

    console.log(`✅ Removed IP ${removedEntry.ipAddress} (${removedEntry.name}) from whitelist`);
    return NextResponse.json({
      success: true,
      message: 'IP address successfully removed from whitelist',
      data: removedEntry
    });

  } catch (error) {
    console.error('❌ IP Whitelist DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove IP from whitelist' },
      { status: 500 }
    );
  }
});

// Export the whitelist for use by middleware
export { ipWhitelist, getClientIP, updateIPActivity, isKenTheCreator };