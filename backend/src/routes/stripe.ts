import express from 'express';
import { authenticateToken } from '../middleware/enhancedAuth';
import {
  checkStripeEnabled,
  createCustomerPortalSession,
  getCustomerPaymentHistory,
  handleStripeWebhook
} from '../controllers/stripeController';

const router = express.Router();

// Check if Stripe is enabled and configured
router.get('/status', authenticateToken, checkStripeEnabled);

// Create customer portal session
router.post('/create-portal-session', authenticateToken, createCustomerPortalSession);

// Get customer payment history
router.get('/customer/:customerId/payments', authenticateToken, getCustomerPaymentHistory);

// Handle Stripe webhooks (no auth needed - verified via webhook signature)
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;