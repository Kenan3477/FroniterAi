import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
// Get all integrations for organization
export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, error: 'User organization not found' });
    }
    
    const integrations = await prisma.integration.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' }
    });
    
    // Add available integrations that aren't configured yet
    const availableIntegrations = [
      {
        name: 'stripe',
        displayName: 'Stripe Payments',
        description: 'Process payments and manage billing during customer calls',
        category: 'payments',
        isAvailable: true
      },
      {
        name: 'twilio',
        displayName: 'Twilio Voice',
        description: 'Voice calling and SMS capabilities',
        category: 'telephony',
        isAvailable: true
      },
      {
        name: 'salesforce',
        displayName: 'Salesforce CRM',
        description: 'Customer relationship management integration',
        category: 'crm',
        isAvailable: false // Coming soon
      }
    ];
    
    const enrichedIntegrations = availableIntegrations.map(available => {
      const existing = integrations.find(int => int.name === available.name);
      return {
        ...available,
        id: existing?.id,
        isEnabled: existing?.isEnabled || false,
        isConfigured: !!existing?.configuration,
        enabledAt: existing?.enabledAt,
        updatedAt: existing?.updatedAt
      };
    });
    
    res.json({
      success: true,
      integrations: enrichedIntegrations
    });
    
  } catch (error) {
    console.error('Failed to get integrations:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve integrations' });
  }
};

// Toggle integration enabled status
export const toggleIntegration = async (req: Request, res: Response) => {
  try {
    const { integrationName } = req.params;
    const { enabled } = req.body;
    const user = (req as any).user;
    
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, error: 'User organization not found' });
    }
    
    // Check if user has permission to manage integrations
    if (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR') {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions to manage integrations' 
      });
    }
    
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId: user.organizationId,
        name: integrationName
      }
    });
    
    let integration;
    
    if (existingIntegration) {
      // Update existing integration
      integration = await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          isEnabled: enabled,
          enabledBy: enabled ? user.id.toString() : null,
          enabledAt: enabled ? new Date() : null,
          updatedAt: new Date()
        }
      });
    } else if (enabled) {
      // Create new integration if enabling
      const integrationConfig = getIntegrationConfig(integrationName);
      if (!integrationConfig) {
        return res.status(400).json({ 
          success: false, 
          error: 'Unknown integration type' 
        });
      }
      
      integration = await prisma.integration.create({
        data: {
          name: integrationName,
          displayName: integrationConfig.displayName,
          description: integrationConfig.description,
          type: integrationConfig.type,
          provider: integrationConfig.provider,
          isEnabled: true,
          organizationId: user.organizationId,
          enabledBy: user.id.toString(),
          enabledAt: new Date(),
          createdBy: user.id
        }
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Integration does not exist' 
      });
    }
    
    res.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        displayName: integration.displayName,
        isEnabled: integration.isEnabled,
        enabledAt: integration.enabledAt
      }
    });
    
  } catch (error) {
    console.error('Failed to toggle integration:', error);
    res.status(500).json({ success: false, error: 'Failed to update integration' });
  }
};

// Helper function to get integration configuration
function getIntegrationConfig(name: string) {
  const configs: Record<string, any> = {
    stripe: {
      displayName: 'Stripe Payments',
      description: 'Process payments and manage billing during customer calls',
      type: 'payment',
      provider: 'stripe'
    },
    twilio: {
      displayName: 'Twilio Voice',
      description: 'Voice calling and SMS capabilities',
      type: 'telephony',
      provider: 'twilio'
    }
  };
  
  return configs[name] || null;
}

// Configure Stripe integration
export const configureStripe = async (req: Request, res: Response) => {
  try {
    const { publishableKey, secretKey, isTestMode } = req.body;
    const user = (req as any).user;
    
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, error: 'User organization not found' });
    }
    
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can configure integrations' 
      });
    }
    
    // Validate Stripe keys (basic format check)
    if (!publishableKey?.startsWith('pk_') || !secretKey?.startsWith('sk_')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid Stripe API keys format' 
      });
    }
    
    // For now, we'll store them directly (in production, encrypt them)
    // TODO: Implement proper encryption
    const encryptedSecretKey = secretKey; // encrypt(secretKey);
    const encryptedPublishableKey = publishableKey; // encrypt(publishableKey);
    
    const config = await prisma.stripeConfiguration.upsert({
      where: { organizationId: user.organizationId },
      update: {
        publishableKey: encryptedPublishableKey,
        secretKey: encryptedSecretKey,
        isTestMode: isTestMode ?? true,
        updatedAt: new Date()
      },
      create: {
        organizationId: user.organizationId,
        publishableKey: encryptedPublishableKey,
        secretKey: encryptedSecretKey,
        isTestMode: isTestMode ?? true
      }
    });

    // Also update the integration to mark it as configured
    await prisma.integration.updateMany({
      where: {
        organizationId: user.organizationId,
        name: 'stripe'
      },
      data: {
        configuration: JSON.stringify({ hasKeys: true }),
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      configuration: {
        id: config.id,
        isTestMode: config.isTestMode,
        hasKeys: !!(config.publishableKey && config.secretKey),
        updatedAt: config.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Failed to configure Stripe:', error);
    res.status(500).json({ success: false, error: 'Failed to configure Stripe integration' });
  }
};