/**
 * IP Whitelist Middleware
 * Bypasses rate limiting and security checks for whitelisted IPs
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/index';

export interface WhitelistedIP {
  id: string;
  ipAddress: string;
  name: string;
  description: string | null;
  addedBy: string;
  addedAt: Date;
  lastActivity: Date | null;
  isActive: boolean;
  activityCount: number;
}

class IPWhitelistManager {
  private static instance: IPWhitelistManager;
  private whitelist: Map<string, WhitelistedIP> = new Map();
  private lastRefresh: number = 0;
  private REFRESH_INTERVAL = 60 * 1000; // 1 minute

  static getInstance(): IPWhitelistManager {
    if (!IPWhitelistManager.instance) {
      IPWhitelistManager.instance = new IPWhitelistManager();
      IPWhitelistManager.instance.initializeWhitelist();
    }
    return IPWhitelistManager.instance;
  }

  private async initializeWhitelist() {
    try {
      // Add default whitelisted IPs
      const defaultIPs = [
        {
          id: 'default-localhost',
          ipAddress: '127.0.0.1',
          name: 'Localhost',
          description: 'Local development',
          addedBy: 'system',
          addedAt: new Date(),
          lastActivity: null,
          isActive: true,
          activityCount: 0
        },
        {
          id: 'default-localhost-ipv6',
          ipAddress: '::1',
          name: 'Localhost IPv6',
          description: 'Local development (IPv6)',
          addedBy: 'system',
          addedAt: new Date(),
          lastActivity: null,
          isActive: true,
          activityCount: 0
        },
        {
          id: 'ken-current-ip',
          ipAddress: '209.198.129.239',
          name: 'Ken Current IP',
          description: 'Ken office IP address',
          addedBy: 'system',
          addedAt: new Date(),
          lastActivity: null,
          isActive: true,
          activityCount: 0
        },
        {
          id: 'ken-home-ip',
          ipAddress: '90.204.67.241',
          name: 'Ken Home IP',
          description: 'Ken home IP address',
          addedBy: 'system',
          addedAt: new Date(),
          lastActivity: null,
          isActive: true,
          activityCount: 0
        }
      ];

      defaultIPs.forEach(ip => {
        this.whitelist.set(ip.ipAddress, ip);
      });

      console.log('✅ IP Whitelist initialized with default IPs:', Array.from(this.whitelist.keys()));
    } catch (error) {
      console.error('❌ Error initializing IP whitelist:', error);
    }
  }

  private async refreshWhitelist() {
    const now = Date.now();
    if (now - this.lastRefresh < this.REFRESH_INTERVAL) {
      return; // Don't refresh too frequently
    }

    try {
      // In future, fetch from database
      // For now, use in-memory whitelist
      this.lastRefresh = now;
    } catch (error) {
      console.error('❌ Error refreshing whitelist:', error);
    }
  }

  async isWhitelisted(ipAddress: string): Promise<boolean> {
    await this.refreshWhitelist();
    return this.whitelist.has(ipAddress);
  }

  async addIP(entry: Omit<WhitelistedIP, 'activityCount'>): Promise<WhitelistedIP> {
    const newEntry: WhitelistedIP = {
      ...entry,
      activityCount: 0
    };
    this.whitelist.set(entry.ipAddress, newEntry);
    console.log(`✅ Added IP to whitelist: ${entry.ipAddress} (${entry.name})`);
    return newEntry;
  }

  async removeIP(ipAddress: string): Promise<boolean> {
    const deleted = this.whitelist.delete(ipAddress);
    if (deleted) {
      console.log(`🗑️ Removed IP from whitelist: ${ipAddress}`);
    }
    return deleted;
  }

  async updateActivity(ipAddress: string): Promise<void> {
    const entry = this.whitelist.get(ipAddress);
    if (entry) {
      entry.activityCount++;
      entry.lastActivity = new Date();
    }
  }

  getAll(): WhitelistedIP[] {
    return Array.from(this.whitelist.values());
  }

  getByIP(ipAddress: string): WhitelistedIP | undefined {
    return this.whitelist.get(ipAddress);
  }
}

export const ipWhitelistManager = IPWhitelistManager.getInstance();

/**
 * Middleware to check if IP is whitelisted
 * Sets req.ipWhitelisted = true if IP is on whitelist
 */
export const checkIPWhitelist = async (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  
  const isWhitelisted = await ipWhitelistManager.isWhitelisted(clientIP);
  
  if (isWhitelisted) {
    (req as any).ipWhitelisted = true;
    await ipWhitelistManager.updateActivity(clientIP);
    console.log(`✅ Whitelisted IP detected: ${clientIP}`);
  }
  
  next();
};
