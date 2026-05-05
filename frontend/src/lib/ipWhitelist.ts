/**
 * Shared IP Whitelist Storage
 * Central storage for IP whitelist data shared between middleware and API routes
 */

export interface IPWhitelistEntry {
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

// Shared in-memory storage for IP whitelist (in production, this should be in database)
export let ipWhitelist: IPWhitelistEntry[] = [
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
  },
  {
    id: 'ken-office-ip',
    ipAddress: '72.14.201.120',
    name: 'Ken Office IP',
    description: 'Ken office IP address - Real IP from Railway',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'ken-railway-proxy',
    ipAddress: '209.198.129.239',
    name: 'Railway Proxy IP',
    description: 'Railway proxy/internal IP - keeping for compatibility',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'ken-home-ip',
    ipAddress: '86.160.65.86',
    name: 'Ken Home IP',
    description: 'Ken home IP address for system access',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'ken-actual-current-location',
    ipAddress: '86.160.65.85',
    name: 'Ken Actual Current Location',
    description: 'Ken ACTUAL current location IP (86.160.65.85) - Added April 21, 2026',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'ken-current-location',
    ipAddress: '162.120.188.145',
    name: 'Ken Current Location IP',
    description: 'Ken current location IP - Added April 21, 2026',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'ken-old-current',
    ipAddress: '176.35.52.123',
    name: 'Ken Old Current IP',
    description: 'Legacy IP - keeping for backward compatibility',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'ken-old-home',
    ipAddress: '86.160.65.15',
    name: 'Ken Old Home IP',
    description: 'Legacy home IP - keeping for backward compatibility',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'cafe-location',
    ipAddress: '31.94.36.172',
    name: 'Cafe',
    description: 'Cafe location - Whitelisted for access',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'location-2026-05-01',
    ipAddress: '150.228.9.123',
    name: 'Location-2026-05-01',
    description: 'IP whitelisted on 2026-05-01',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'location-2026-05-05',
    ipAddress: '154.146.239.233',
    name: 'Location-2026-05-05',
    description: 'IP whitelisted on 2026-05-05',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  }
];

export function getIPWhitelist(): IPWhitelistEntry[] {
  return ipWhitelist;
}

export function addIPToWhitelist(entry: Omit<IPWhitelistEntry, 'id' | 'addedAt' | 'activityCount' | 'lastActivity'>): IPWhitelistEntry {
  const newEntry: IPWhitelistEntry = {
    ...entry,
    id: `ip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedAt: new Date(),
    activityCount: 0,
    lastActivity: undefined
  };
  
  ipWhitelist.unshift(newEntry);
  return newEntry;
}

export function removeIPFromWhitelist(id: string): boolean {
  const initialLength = ipWhitelist.length;
  ipWhitelist = ipWhitelist.filter(entry => entry.id !== id);
  return ipWhitelist.length < initialLength;
}

export function updateIPActivity(ipAddress: string): void {
  const entry = ipWhitelist.find(item => item.ipAddress === ipAddress);
  if (entry) {
    entry.activityCount += 1;
    entry.lastActivity = new Date();
  }
}

export function isIPWhitelisted(ipAddress: string): boolean {
  console.log(`🔍 Checking IP whitelist for: ${ipAddress}`);
  console.log(`📋 Total whitelist entries: ${ipWhitelist.length}`);
  console.log(`📋 Active entries: ${ipWhitelist.filter(e => e.isActive).length}`);
  console.log(`📋 All IPs in whitelist: ${ipWhitelist.map(e => e.ipAddress).join(', ')}`);
  
  const isWhitelisted = ipWhitelist.some(entry => entry.isActive && entry.ipAddress === ipAddress);
  console.log(`✅ Is ${ipAddress} whitelisted? ${isWhitelisted}`);
  
  return isWhitelisted;
}

export function setIPWhitelist(newWhitelist: IPWhitelistEntry[]): void {
  ipWhitelist = newWhitelist;
}