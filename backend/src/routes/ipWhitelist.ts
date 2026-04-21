/**
 * IP Whitelist Management Routes
 * CRUD operations for IP whitelist
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { ipWhitelistManager, WhitelistedIP } from '../middleware/ipWhitelist';

const router = Router();

/**
 * GET /api/admin/ip-whitelist
 * Get all whitelisted IPs
 */
router.get('/', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const whitelist = ipWhitelistManager.getAll();
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    res.json({
      success: true,
      data: {
        whitelist,
        currentIP: clientIP,
        totalEntries: whitelist.length,
        activeEntries: whitelist.filter(item => item.isActive).length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching IP whitelist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch IP whitelist'
    });
  }
});

/**
 * POST /api/admin/ip-whitelist
 * Add new IP to whitelist
 */
router.post('/', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { ipAddress, name, description } = req.body;

    if (!ipAddress || !name) {
      return res.status(400).json({
        success: false,
        error: 'IP address and name are required'
      });
    }

    // Check if IP already exists
    const existing = ipWhitelistManager.getByIP(ipAddress);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'IP address already whitelisted'
      });
    }

    const user = (req as any).user;
    const newEntry = await ipWhitelistManager.addIP({
      id: `ip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ipAddress,
      name,
      description: description || null,
      addedBy: user.email || user.username,
      addedAt: new Date(),
      lastActivity: null,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: newEntry,
      message: `IP ${ipAddress} (${name}) has been whitelisted`
    });
  } catch (error) {
    console.error('❌ Error adding IP to whitelist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add IP to whitelist'
    });
  }
});

/**
 * DELETE /api/admin/ip-whitelist/:ipAddress
 * Remove IP from whitelist
 */
router.delete('/:ipAddress', authenticate, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.params;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }

    // Don't allow removing localhost
    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return res.status(403).json({
        success: false,
        error: 'Cannot remove localhost from whitelist'
      });
    }

    const removed = await ipWhitelistManager.removeIP(ipAddress);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'IP address not found in whitelist'
      });
    }

    res.json({
      success: true,
      message: `IP ${ipAddress} has been removed from whitelist`
    });
  } catch (error) {
    console.error('❌ Error removing IP from whitelist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove IP from whitelist'
    });
  }
});

export default router;
