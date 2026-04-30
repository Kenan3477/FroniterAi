/**
 * IP Whitelist Middleware
 * Bypasses rate limiting and security checks for whitelisted IPs
 * NOW WITH DATABASE PERSISTENCE
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/index';
import { getClientIP, normalizeClientIpForWhitelist } from '../utils/ipUtils';

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
  private cache: Map<string, WhitelistedIP> = new Map();
  private lastRefresh: number = 0;
  private REFRESH_INTERVAL = 30 * 1000; // 30 seconds

  static getInstance(): IPWhitelistManager {
    if (!IPWhitelistManager.instance) {
      IPWhitelistManager.instance = new IPWhitelistManager();
      IPWhitelistManager.instance.initializeWhitelist();
    }
    return IPWhitelistManager.instance;
  }

  private async initializeWhitelist() {
    try {
      console.log('🔄 Initializing IP whitelist from database...');
      
      // Ensure default IPs exist in database
      await this.ensureDefaultIPs();
      
      // Load all from database
      await this.loadFromDatabase();
      
      console.log(`✅ IP whitelist initialized with ${this.cache.size} entries`);
    } catch (error) {
      console.error('❌ Failed to initialize IP whitelist:', error);
    }
  }

  private async ensureDefaultIPs() {
    const defaultIPs = [
      {
        ipAddress: '127.0.0.1',
        name: 'Localhost',
        description: 'Local development',
        addedBy: 'system'
      },
      {
        ipAddress: '::1',
        name: 'Localhost IPv6',
        description: 'Local development (IPv6)',
        addedBy: 'system'
      },
      {
        ipAddress: '209.198.129.239',
        name: 'Ken Current IP',
        description: 'Office IP - Always whitelisted',
        addedBy: 'system'
      },
      {
        ipAddress: '86.160.65.86',
        name: 'Ken Home IP',
        description: 'Home IP - Always whitelisted',
        addedBy: 'system'
      },
      {
        ipAddress: '44.215.104.214',
        name: 'Kenan IP 1',
        description: 'Kenan working IP - Auto-whitelisted',
        addedBy: 'system'
      },
      {
        ipAddress: '176.35.52.123',
        name: 'Kenan IP 2',
        description: 'Kenan working IP - Auto-whitelisted',
        addedBy: 'system'
      }
    ];

    for (const ip of defaultIPs) {
      try {
        const existing = await prisma.ipWhitelist.findUnique({
          where: { ipAddress: ip.ipAddress }
        });

        if (!existing) {
          await prisma.ipWhitelist.create({
            data: {
              ipAddress: ip.ipAddress,
              name: ip.name,
              description: ip.description,
              addedBy: ip.addedBy,
              isActive: true,
              activityCount: 0
            }
          });
          console.log(`✅ Added default IP to database: ${ip.ipAddress} (${ip.name})`);
        }
      } catch (error) {
        console.error(`⚠️  Failed to add default IP ${ip.ipAddress}:`, error);
      }
    }
  }

  private async loadFromDatabase() {
    try {
      const dbIPs = await prisma.ipWhitelist.findMany({
        where: { isActive: true }
      });

      this.cache.clear();
      
      for (const ip of dbIPs) {
        const key = normalizeClientIpForWhitelist(ip.ipAddress);
        this.cache.set(key, {
          id: ip.id,
          ipAddress: ip.ipAddress,
          name: ip.name,
          description: ip.description,
          addedBy: ip.addedBy,
          addedAt: ip.addedAt,
          lastActivity: ip.lastActivity,
          isActive: ip.isActive,
          activityCount: ip.activityCount
        });
      }

      this.lastRefresh = Date.now();
      console.log(`🔄 Loaded ${dbIPs.length} active IPs from database`);
    } catch (error) {
      console.error('❌ Failed to load IPs from database:', error);
    }
  }

  async isWhitelisted(ipAddress: string): Promise<boolean> {
    const normalized = normalizeClientIpForWhitelist(ipAddress);

    if (Date.now() - this.lastRefresh > this.REFRESH_INTERVAL) {
      await this.loadFromDatabase();
    }

    if (this.cache.has(normalized) || this.cache.has(ipAddress.trim())) {
      const key = this.cache.has(normalized) ? normalized : ipAddress.trim();
      this.updateActivity(key).catch((err) =>
        console.error(`Failed to update activity for ${key}:`, err),
      );
      return true;
    }

    try {
      const row = await prisma.ipWhitelist.findFirst({
        where: {
          isActive: true,
          OR: [{ ipAddress: normalized }, { ipAddress: ipAddress.trim() }],
        },
      });
      if (row) {
        const entry: WhitelistedIP = {
          id: row.id,
          ipAddress: row.ipAddress,
          name: row.name,
          description: row.description,
          addedBy: row.addedBy,
          addedAt: row.addedAt,
          lastActivity: row.lastActivity,
          isActive: row.isActive,
          activityCount: row.activityCount,
        };
        this.cache.set(normalizeClientIpForWhitelist(row.ipAddress), entry);
        this.updateActivity(row.ipAddress).catch((err) =>
          console.error(`Failed to update activity for ${row.ipAddress}:`, err),
        );
        return true;
      }
    } catch (e) {
      console.error('❌ isWhitelisted DB fallback failed:', e);
    }

    return false;
  }

  async addIP(ipAddress: string, name: string, addedBy: string, description?: string): Promise<WhitelistedIP> {
    const normalized = normalizeClientIpForWhitelist(ipAddress);
    try {
      // Add to database first
      const dbIP = await prisma.ipWhitelist.create({
        data: {
          ipAddress: normalized,
          name,
          description: description || null,
          addedBy,
          isActive: true,
          activityCount: 0
        }
      });

      // Update cache
      const newIP: WhitelistedIP = {
        id: dbIP.id,
        ipAddress: dbIP.ipAddress,
        name: dbIP.name,
        description: dbIP.description,
        addedBy: dbIP.addedBy,
        addedAt: dbIP.addedAt,
        lastActivity: dbIP.lastActivity,
        isActive: dbIP.isActive,
        activityCount: dbIP.activityCount
      };

      this.cache.set(normalized, newIP);
      
      console.log(`✅ Added IP to whitelist (DB + cache): ${normalized} (${name})`);
      
      return newIP;
    } catch (error) {
      console.error(`❌ Failed to add IP ${ipAddress}:`, error);
      throw error;
    }
  }

  async removeIP(ipAddress: string): Promise<boolean> {
    const key = normalizeClientIpForWhitelist(ipAddress);
    // Prevent removal of localhost
    if (key === '127.0.0.1' || key === '::1') {
      throw new Error('Cannot remove localhost from whitelist');
    }

    try {
      // Mark as inactive in database (soft delete)
      await prisma.ipWhitelist.updateMany({
        where: {
          OR: [{ ipAddress: key }, { ipAddress: ipAddress.trim() }],
        },
        data: { isActive: false }
      });

      // Remove from cache (normalized + raw)
      this.cache.delete(key);
      this.cache.delete(ipAddress.trim());
      
      console.log(`✅ Removed IP from whitelist: ${ipAddress}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove IP ${ipAddress}:`, error);
      throw error;
    }
  }

  async updateActivity(ipAddress: string): Promise<void> {
    try {
      await prisma.ipWhitelist.updateMany({
        where: { ipAddress, isActive: true },
        data: {
          lastActivity: new Date(),
          activityCount: { increment: 1 }
        }
      });

      // Update cache
      const cached = this.cache.get(ipAddress);
      if (cached) {
        cached.lastActivity = new Date();
        cached.activityCount += 1;
      }
    } catch (error) {
      console.error(`Failed to update activity for ${ipAddress}:`, error);
    }
  }

  async getAll(): Promise<WhitelistedIP[]> {
    // Always load fresh from database
    await this.loadFromDatabase();
    return Array.from(this.cache.values());
  }

  getByIP(ipAddress: string): WhitelistedIP | undefined {
    return (
      this.cache.get(normalizeClientIpForWhitelist(ipAddress)) ||
      this.cache.get(ipAddress.trim())
    );
  }

  async forceRefresh(): Promise<void> {
    await this.loadFromDatabase();
  }
}

export const ipWhitelistManager = IPWhitelistManager.getInstance();

/**
 * Middleware to check if request IP is whitelisted
 * Sets req.ipWhitelisted = true for whitelisted IPs
 */
export const checkIPWhitelist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // DEBUG: Log all IP-related headers
    console.log('🔍 IP DETECTION DEBUG:', {
      'CF-Connecting-IP': req.get('CF-Connecting-IP'),
      'X-Forwarded-For': req.get('X-Forwarded-For'),
      'X-Real-IP': req.get('X-Real-IP'),
      'req.ip': req.ip,
      'connection.remoteAddress': req.connection?.remoteAddress,
      'socket.remoteAddress': req.socket?.remoteAddress
    });
    
    const clientIP = getClientIP(req);
    console.log(`🎯 Detected client IP: ${clientIP}`);
    
    const isWhitelisted = await ipWhitelistManager.isWhitelisted(clientIP);
    
    // Set flag on request object for other middleware to check
    (req as any).ipWhitelisted = isWhitelisted;
    
    if (isWhitelisted) {
      console.log(`✅ IP is whitelisted: ${clientIP}`);
    } else {
      console.log(`❌ IP NOT WHITELISTED: ${clientIP}`);
      console.log(`📋 Current whitelisted IPs:`, Array.from((ipWhitelistManager as any).cache.keys()));
    }
    
    next();
  } catch (error) {
    console.error('Error checking IP whitelist:', error);
    next(); // Continue even if whitelist check fails
  }
};
