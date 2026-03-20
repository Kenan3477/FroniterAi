import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const crypto = require('crypto');

const prisma = new PrismaClient();

// Check if Stripe is enabled for organization
export const checkStripeEnabled = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, error: 'User organization not found' });
    }
    
    // Check if Stripe integration is enabled
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: user.organizationId,
        name: 'stripe',
        isEnabled: true
      }
    });
    
    let stripeConfig = null;
    if (integration) {
      stripeConfig = await prisma.stripeConfiguration.findUnique({
        where: { organizationId: user.organizationId }
      });
    }
    
    res.json({
      success: true,
      isEnabled: !!integration,
      isConfigured: !!(stripeConfig?.publishableKey && stripeConfig?.secretKey),
      testMode: stripeConfig?.isTestMode || false
    });
    
  } catch (error) {
    console.error('Failed to check Stripe status:', error);
    res.status(500).json({ success: false, error: 'Failed to check Stripe status' });
  }
};

// Create Stripe portal session for customer
export const createCustomerPortalSession = async (req: Request, res: Response) => {
  try {
    const { customerId, callId } = req.body;
    const user = (req as any).user;
    
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, error: 'User organization not found' });
    }
    
    // Check if Stripe is enabled and configured
    const stripeConfig = await prisma.stripeConfiguration.findUnique({
      where: { organizationId: user.organizationId }
    });
    
    if (!stripeConfig?.secretKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Stripe not configured for this organization' 
      });
    }
    
    // Get customer information
    const customer = await prisma.contact.findUnique({
      where: { contactId: customerId }
    });
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    // Log the portal session creation
    await prisma.paymentInteraction.create({
      data: {
        callId: callId || null,
        agentId: user.id,
        customerId: customerId,
        action: 'PORTAL_OPENED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        metadata: JSON.stringify({
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email
        })
      }
    });
    
    // For demo purposes, return a mock portal URL
    // In production, this would integrate with actual Stripe API
    const portalUrl = `https://billing.stripe.com/p/session/test_${Date.now()}`;
    
    res.json({
      success: true,
      portalUrl: portalUrl,
      customerId: customerId,
      sessionId: `session_${Date.now()}`
    });
    
  } catch (error) {
    console.error('Failed to create Stripe portal session:', error);
    res.status(500).json({ success: false, error: 'Failed to create portal session' });
  }
};

// Get customer payment history
export const getCustomerPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const user = (req as any).user;
    
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, error: 'User organization not found' });
    }
    
    // Check if customer exists
    const customer = await prisma.contact.findUnique({
      where: { contactId: customerId }
    });
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    // Get payment interactions for this customer
    const paymentInteractions = await prisma.paymentInteraction.findMany({
      where: { customerId: customerId },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        agent: {
          select: { firstName: true, lastName: true }
        },
        call: {
          select: { id: true, startTime: true, duration: true }
        }
      }
    });
    
    // For demo purposes, return mock payment data
    // In production, this would fetch real data from Stripe API
    const mockPayments = [
      {
        id: 'pi_mock_001',
        amount: 9999, // $99.99 in cents
        currency: 'usd',
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        description: 'Subscription renewal',
        receiptUrl: 'https://pay.stripe.com/receipts/mock_receipt'
      },
      {
        id: 'pi_mock_002',
        amount: 4999, // $49.99 in cents
        currency: 'usd',
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
        description: 'One-time payment'
      }
    ];
    
    const mockSubscriptions = [
      {
        id: 'sub_mock_001',
        status: 'active',
        currentPeriodStart: Math.floor(Date.now() / 1000) - 86400,
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 2505600, // 30 days from now
        items: [
          {
            price: {
              unitAmount: 9999,
              currency: 'usd',
              recurring: { interval: 'month' }
            },
            quantity: 1
          }
        ]
      }
    ];
    
    const mockPaymentMethods = [
      {
        id: 'pm_mock_001',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025
        }
      }
    ];
    
    res.json({
      success: true,
      payments: mockPayments,
      subscriptions: mockSubscriptions,
      paymentMethods: mockPaymentMethods,
      interactions: paymentInteractions.map(interaction => ({
        id: interaction.id,
        action: interaction.action,
        timestamp: interaction.timestamp,
        agent: interaction.agent ? `${interaction.agent.firstName} ${interaction.agent.lastName}` : 'Unknown',
        callId: interaction.callId,
        metadata: interaction.metadata ? JSON.parse(interaction.metadata) : null
      }))
    });
    
  } catch (error) {
    console.error('Failed to get payment history:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve payment history' });
  }
};

// Handle Stripe webhook (for future implementation)
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    // For future implementation - handle Stripe webhook events
    // This would verify webhook signatures and process events like:
    // - payment_intent.succeeded
    // - subscription.created
    // - invoice.payment_failed
    // etc.
    
    console.log('Stripe webhook received:', req.body);
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Failed to handle webhook:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
};

// Helper function for encryption (placeholder)
const encrypt = (text: string): string => {
  // This is a placeholder - implement proper encryption in production
  // using a proper encryption library and secure key management
  return Buffer.from(text).toString('base64');
};

const decrypt = (encryptedText: string): string => {
  // This is a placeholder - implement proper decryption in production
  return Buffer.from(encryptedText, 'base64').toString();
};