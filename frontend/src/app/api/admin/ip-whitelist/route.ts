/**
 * IP Whitelist Management API
 * Only accessible by Ken (ken@simpleemails.co.uk) - Creator of Omnivox
 * Manages IP addresses that are allowed to access the system
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { 
  getIPWhitelist, 
  addIPToWhitelist, 
  removeIPFromWhitelist, 
  type IPWhitelistEntry 
} from '@/lib/ipWhitelist';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
  // This is now handled by the shared module
  import('@/lib/ipWhitelist').then(({ updateIPActivity }) => {
    updateIPActivity(ipAddress);
  });
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
    const whitelist = getIPWhitelist();
    
    // Update activity for current IP
    import('@/lib/ipWhitelist').then(({ updateIPActivity }) => {
      updateIPActivity(currentIP);
    });

    console.log('✅ Returning IP whitelist data', { count: whitelist.length, currentIP });
    return NextResponse.json({
      success: true,
      data: {
        whitelist,
        currentIP: currentIP,
        totalEntries: whitelist.length,
        activeEntries: whitelist.filter(item => item.isActive).length
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
    const whitelist = getIPWhitelist();
    const existingEntry = whitelist.find(item => item.ipAddress === ipAddress);
    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: 'IP address is already whitelisted' },
        { status: 409 }
      );
    }

    // Create new whitelist entry using shared function
    const newEntry = addIPToWhitelist({
      ipAddress,
      name,
      description: description || '',
      addedBy: user.email,
      isActive: true
    });

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

    const entryToRemove = getIPWhitelist().find(item => item.id === ipId);
    if (!entryToRemove) {
      return NextResponse.json(
        { success: false, error: 'IP address not found in whitelist' },
        { status: 404 }
      );
    }

    const success = removeIPFromWhitelist(ipId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove IP from whitelist' },
        { status: 500 }
      );
    }

    console.log(`✅ Removed IP ${entryToRemove.ipAddress} (${entryToRemove.name}) from whitelist`);
    return NextResponse.json({
      success: true,
      message: 'IP address successfully removed from whitelist',
      data: entryToRemove
    });

  } catch (error) {
    console.error('❌ IP Whitelist DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove IP from whitelist' },
      { status: 500 }
    );
  }
});

// Export utility functions for use by middleware
export { getClientIP, isKenTheCreator };