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
    id: 'ken-current-ip',
    ipAddress: '176.35.52.123',
    name: 'Ken Current IP',
    description: 'Ken current IP address for system access',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'ken-home-ip',
    ipAddress: '86.160.65.15',
    name: 'Ken Home IP',
    description: 'Ken home IP address for system access',
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
  return ipWhitelist.some(entry => entry.isActive && entry.ipAddress === ipAddress);
}

export function setIPWhitelist(newWhitelist: IPWhitelistEntry[]): void {
  ipWhitelist = newWhitelist;
}