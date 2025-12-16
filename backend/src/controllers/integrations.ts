import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Integration Management Controller
 * Handles integrations, connections, and webhooks
 */

// ============================================================================
// INTEGRATIONS
// ============================================================================

export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const integrations = await prisma.integration.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { connections: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: integrations
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrations'
    });
  }
};

export const createIntegration = async (req: Request, res: Response) => {
  try {
    const {
      name,
      displayName,
      description,
      category,
      type,
      configSchema,
      iconUrl,
      documentationUrl
    } = req.body;

    // Use authenticated user ID or default
    const createdByUserId = (req as any).user?.id || 'system';

    const integration = await prisma.integration.create({
      data: {
        name,
        displayName,
        description,
        category,
        type,
        configSchema: JSON.stringify(configSchema),
        iconUrl,
        documentationUrl,
        createdByUserId
      }
    });

    res.status(201).json({
      success: true,
      data: integration
    });
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create integration'
    });
  }
};

export const updateIntegration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.configSchema) {
      updateData.configSchema = JSON.stringify(updateData.configSchema);
    }

    const integration = await prisma.integration.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: integration
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update integration'
    });
  }
};

export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.integration.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete integration'
    });
  }
};

// ============================================================================
// CONNECTIONS
// ============================================================================

export const getConnections = async (req: Request, res: Response) => {
  try {
    const connections = await prisma.integrationConnection.findMany({
      include: {
        integration: {
          select: {
            name: true,
            displayName: true,
            category: true,
            iconUrl: true
          }
        },
        _count: {
          select: { webhooks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connections'
    });
  }
};

export const createConnection = async (req: Request, res: Response) => {
  try {
    const {
      integrationId,
      name,
      config
    } = req.body;

    // Use authenticated user ID or default
    const createdByUserId = (req as any).user?.id || 'system';

    const connection = await prisma.integrationConnection.create({
      data: {
        integrationId,
        name,
        config: JSON.stringify(config),
        createdByUserId
      }
    });

    res.status(201).json({
      success: true,
      data: connection
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create connection'
    });
  }
};

export const updateConnection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.config) {
      updateData.config = JSON.stringify(updateData.config);
    }

    const connection = await prisma.integrationConnection.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: connection
    });
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update connection'
    });
  }
};

export const deleteConnection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.integrationConnection.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Connection deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete connection'
    });
  }
};

// ============================================================================
// WEBHOOKS
// ============================================================================

export const getWebhooks = async (req: Request, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      include: {
        connection: {
          select: {
            name: true,
            integration: {
              select: {
                name: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhooks'
    });
  }
};

export const createWebhook = async (req: Request, res: Response) => {
  try {
    const {
      connectionId,
      name,
      url,
      method,
      headers,
      secret,
      events
    } = req.body;

    // Use authenticated user ID or default
    const createdByUserId = (req as any).user?.id || 'system';

    const webhook = await prisma.webhook.create({
      data: {
        connectionId: connectionId || null,
        name,
        url,
        method: method || 'POST',
        headers: headers ? JSON.stringify(headers) : null,
        secret,
        events: JSON.stringify(events),
        createdByUserId
      }
    });

    res.status(201).json({
      success: true,
      data: webhook
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create webhook'
    });
  }
};

export const updateWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.headers) {
      updateData.headers = JSON.stringify(updateData.headers);
    }
    if (updateData.events) {
      updateData.events = JSON.stringify(updateData.events);
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: webhook
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update webhook'
    });
  }
};

export const deleteWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.webhook.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    });
  }
};

// ============================================================================
// STATISTICS
// ============================================================================

export const getIntegrationStats = async (req: Request, res: Response) => {
  try {
    const [
      totalIntegrations,
      activeIntegrations,
      totalConnections,
      activeConnections,
      totalWebhooks,
      activeWebhooks
    ] = await Promise.all([
      prisma.integration.count(),
      prisma.integration.count({ where: { isActive: true } }),
      prisma.integrationConnection.count(),
      prisma.integrationConnection.count({ where: { isActive: true } }),
      prisma.webhook.count(),
      prisma.webhook.count({ where: { isActive: true } })
    ]);

    res.json({
      success: true,
      data: {
        integrations: {
          total: totalIntegrations,
          active: activeIntegrations
        },
        connections: {
          total: totalConnections,
          active: activeConnections
        },
        webhooks: {
          total: totalWebhooks,
          active: activeWebhooks
        }
      }
    });
  } catch (error) {
    console.error('Error fetching integration stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integration statistics'
    });
  }
};
