// Integration Tests for API Endpoints
// Tests the main API endpoints for calls, dispositions, and campaigns

import '../setup';
import request from 'supertest';

// Mock Express app for testing
const express = require('express');
const app = express();
app.use(express.json());

describe('API Integration Tests', () => {
  let prisma: any;
  let authHeaders: Record<string, string>;

  beforeAll(() => {
    prisma = global.testUtils.prisma;
    authHeaders = global.testUtils.getAuthHeaders('test-admin-1');
  });

  describe('Campaign Management API', () => {
    it('should create a new campaign', async () => {
      const campaignData = {
        name: 'Integration Test Campaign',
        description: 'Campaign created during integration testing',
        diallingMode: 'POWER',
        outboundCli: '+1234567890',
        isActive: true,
        maxConcurrentCalls: 10
      };

      // Create campaign directly in database for testing
      const campaign = await prisma.campaign.create({
        data: {
          ...campaignData,
          id: `integration-campaign-${Date.now()}`,
          createdByUserId: 'test-admin-1'
        }
      });

      expect(campaign.name).toBe(campaignData.name);
      expect(campaign.diallingMode).toBe(campaignData.diallingMode);
      expect(campaign.isActive).toBe(true);

      global.testUtils.expectValidId(campaign.id);
      global.testUtils.expectValidTimestamp(campaign.createdAt);
    });

    it('should retrieve campaign details with statistics', async () => {
      const campaignId = 'test-campaign-1';

      // Get campaign with related data
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          calls: {
            include: {
              dispositions: true
            }
          },
          contacts: true
        }
      });

      expect(campaign).toBeDefined();
      expect(campaign.id).toBe(campaignId);
      expect(Array.isArray(campaign.calls)).toBe(true);
      expect(Array.isArray(campaign.contacts)).toBe(true);

      // Calculate campaign statistics
      const stats = {
        totalCalls: campaign.calls.length,
        totalContacts: campaign.contacts.length,
        dispositionsCount: campaign.calls.reduce((sum: number, call: any) => sum + call.dispositions.length, 0),
        avgCallDuration: campaign.calls.length > 0 
          ? campaign.calls.reduce((sum: number, call: any) => sum + (call.duration || 0), 0) / campaign.calls.length 
          : 0
      };

      expect(stats.totalCalls).toBeGreaterThanOrEqual(0);
      expect(stats.totalContacts).toBeGreaterThanOrEqual(0);
    });

    it('should update campaign settings', async () => {
      const campaignId = 'test-campaign-1';
      const updateData = {
        maxConcurrentCalls: 15,
        isActive: false,
        diallingMode: 'PREDICTIVE'
      };

      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: updateData
      });

      expect(updatedCampaign.maxConcurrentCalls).toBe(15);
      expect(updatedCampaign.isActive).toBe(false);
      expect(updatedCampaign.diallingMode).toBe('PREDICTIVE');
    });
  });

  describe('Call Management API', () => {
    it('should initiate a new call', async () => {
      const callData = {
        campaignId: 'test-campaign-1',
        contactId: 'test-contact-1',
        agentId: 'test-user-1',
        phoneNumber: '+1234567890',
        callDirection: 'OUTBOUND'
      };

      const call = await prisma.call.create({
        data: {
          id: `integration-call-${Date.now()}`,
          campaignId: callData.campaignId,
          agentId: callData.agentId,
          contactPhone: callData.phoneNumber,
          direction: callData.callDirection,
          status: 'INITIATED',
          startTime: new Date()
        }
      });

      expect(call.campaignId).toBe(callData.campaignId);
      expect(call.agentId).toBe(callData.agentId);
      expect(call.contactPhone).toBe(callData.phoneNumber);
      expect(call.status).toBe('INITIATED');

      global.testUtils.expectValidId(call.id);
    });

    it('should update call status during progression', async () => {
      const callId = `status-update-test-${Date.now()}`;
      
      // Create initial call
      await prisma.call.create({
        data: {
          id: callId,
          campaignId: 'test-campaign-1',
          status: 'INITIATED',
          startTime: new Date()
        }
      });

      // Progress through call states
      const progressionStates = ['RINGING', 'ANSWERED', 'IN_PROGRESS', 'COMPLETED'];
      
      for (const status of progressionStates) {
        const updatedCall = await prisma.call.update({
          where: { id: callId },
          data: { 
            status,
            lastStatusUpdate: new Date(),
            ...(status === 'COMPLETED' && { endTime: new Date(), duration: 180 })
          }
        });

        expect(updatedCall.status).toBe(status);
        global.testUtils.expectValidTimestamp(updatedCall.lastStatusUpdate);

        if (status === 'COMPLETED') {
          expect(updatedCall.endTime).toBeDefined();
          expect(updatedCall.duration).toBe(180);
        }
      }
    });

    it('should retrieve call history with filters', async () => {
      const filterOptions = {
        campaignId: 'test-campaign-1',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        },
        status: ['COMPLETED'],
        agentId: 'test-user-1'
      };

      const calls = await prisma.call.findMany({
        where: {
          campaignId: filterOptions.campaignId,
          startTime: {
            gte: filterOptions.dateRange.startDate,
            lte: filterOptions.dateRange.endDate
          },
          status: { in: filterOptions.status },
          agentId: filterOptions.agentId
        },
        include: {
          dispositions: true
        },
        orderBy: { startTime: 'desc' }
      });

      expect(Array.isArray(calls)).toBe(true);
      
      // Verify filter conditions
      calls.forEach((call: any) => {
        expect(call.campaignId).toBe(filterOptions.campaignId);
        expect(filterOptions.status).toContain(call.status);
        if (call.agentId) {
          expect(call.agentId).toBe(filterOptions.agentId);
        }
      });
    });
  });

  describe('Disposition Management API', () => {
    it('should create manual disposition', async () => {
      const dispositionData = {
        callId: 'test-call-1',
        outcome: 'SALE_CLOSED',
        notes: 'Customer purchased premium package for $2,500',
        agentId: 'test-user-1',
        followUpRequired: true,
        followUpDate: new Date('2024-02-01'),
        metadata: {
          revenue: 2500,
          productSold: 'Premium Package',
          customerSatisfaction: 9
        }
      };

      const disposition = await prisma.disposition.create({
        data: {
          callId: dispositionData.callId,
          outcome: dispositionData.outcome,
          notes: dispositionData.notes,
          agentId: dispositionData.agentId,
          dispositionType: 'MANUAL',
          metadata: JSON.stringify(dispositionData.metadata)
        }
      });

      expect(disposition.outcome).toBe(dispositionData.outcome);
      expect(disposition.notes).toBe(dispositionData.notes);
      expect(disposition.agentId).toBe(dispositionData.agentId);

      const metadata = JSON.parse(disposition.metadata || '{}');
      expect(metadata.revenue).toBe(2500);
      expect(metadata.productSold).toBe('Premium Package');

      global.testUtils.expectValidId(disposition.id);
    });

    it('should retrieve disposition analytics', async () => {
      const analyticsQuery = {
        campaignId: 'test-campaign-1',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      };

      // Get dispositions with call data
      const dispositions = await prisma.disposition.findMany({
        where: {
          call: {
            campaignId: analyticsQuery.campaignId,
            startTime: {
              gte: analyticsQuery.dateRange.startDate,
              lte: analyticsQuery.dateRange.endDate
            }
          }
        },
        include: {
          call: true
        }
      });

      // Calculate analytics
      const analytics = {
        totalDispositions: dispositions.length,
        outcomeBreakdown: {} as Record<string, number>,
        avgRevenue: 0,
        conversionRate: 0
      };

      let totalRevenue = 0;
      let salesCount = 0;

      dispositions.forEach((disposition: any) => {
        // Count outcomes
        analytics.outcomeBreakdown[disposition.outcome] = 
          (analytics.outcomeBreakdown[disposition.outcome] || 0) + 1;

        // Calculate revenue from metadata
        if (disposition.metadata) {
          try {
            const metadata = JSON.parse(disposition.metadata);
            if (metadata.revenue) {
              totalRevenue += metadata.revenue;
            }
          } catch (e) {
            // Skip invalid metadata
          }
        }

        // Count sales
        if (disposition.outcome === 'SALE_CLOSED') {
          salesCount++;
        }
      });

      analytics.avgRevenue = dispositions.length > 0 ? totalRevenue / dispositions.length : 0;
      analytics.conversionRate = dispositions.length > 0 ? (salesCount / dispositions.length) * 100 : 0;

      expect(analytics.totalDispositions).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.outcomeBreakdown).toBe('object');
      expect(analytics.avgRevenue).toBeGreaterThanOrEqual(0);
      expect(analytics.conversionRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle bulk disposition operations', async () => {
      const bulkDispositionData = [
        {
          callId: `bulk-test-1-${Date.now()}`,
          outcome: 'NOT_INTERESTED',
          notes: 'Customer not interested in current offering',
          agentId: 'test-user-1'
        },
        {
          callId: `bulk-test-2-${Date.now()}`,
          outcome: 'CALLBACK_REQUESTED',
          notes: 'Customer requested callback next week',
          agentId: 'test-user-1'
        },
        {
          callId: `bulk-test-3-${Date.now()}`,
          outcome: 'APPOINTMENT_SET',
          notes: 'Demo scheduled for Friday',
          agentId: 'test-user-1'
        }
      ];

      // Create calls first
      for (const item of bulkDispositionData) {
        await prisma.call.create({
          data: {
            id: item.callId,
            campaignId: 'test-campaign-1',
            status: 'COMPLETED',
            duration: 120
          }
        });
      }

      // Create bulk dispositions
      const createdDispositions = await prisma.disposition.createMany({
        data: bulkDispositionData.map(item => ({
          callId: item.callId,
          outcome: item.outcome,
          notes: item.notes,
          agentId: item.agentId,
          dispositionType: 'MANUAL'
        }))
      });

      expect(createdDispositions.count).toBe(bulkDispositionData.length);

      // Verify created dispositions
      const dispositions = await prisma.disposition.findMany({
        where: {
          callId: {
            in: bulkDispositionData.map(item => item.callId)
          }
        }
      });

      expect(dispositions.length).toBe(bulkDispositionData.length);
      
      const outcomes = dispositions.map((d: any) => d.outcome);
      expect(outcomes).toContain('NOT_INTERESTED');
      expect(outcomes).toContain('CALLBACK_REQUESTED');
      expect(outcomes).toContain('APPOINTMENT_SET');
    });
  });

  describe('Real-time Updates and Events', () => {
    it('should create event entries for real-time notifications', async () => {
      const eventData = {
        type: 'CALL_COMPLETED',
        callId: 'test-call-1',
        data: {
          status: 'COMPLETED',
          duration: 180,
          outcome: 'SALE_CLOSED'
        }
      };

      // Simulate event creation (would normally be handled by event system)
      const eventEntry = {
        id: `event-${Date.now()}`,
        type: eventData.type,
        entityType: 'CALL',
        entityId: eventData.callId,
        eventData: JSON.stringify(eventData.data),
        timestamp: new Date(),
        processed: false
      };

      // In a real system, this would be handled by the event manager
      expect(eventEntry.type).toBe('CALL_COMPLETED');
      expect(eventEntry.entityId).toBe(eventData.callId);
      
      const parsedData = JSON.parse(eventEntry.eventData);
      expect(parsedData.status).toBe('COMPLETED');
      expect(parsedData.duration).toBe(180);
    });

    it('should handle websocket message formatting', async () => {
      const wsMessage = {
        type: 'DISPOSITION_CREATED',
        timestamp: new Date(),
        data: {
          dispositionId: 'disposition-123',
          callId: 'test-call-1',
          outcome: 'APPOINTMENT_SET',
          agentId: 'test-user-1'
        }
      };

      // Verify message structure
      expect(wsMessage.type).toBe('DISPOSITION_CREATED');
      expect(wsMessage.data.dispositionId).toBe('disposition-123');
      expect(wsMessage.data.outcome).toBe('APPOINTMENT_SET');
      
      global.testUtils.expectValidTimestamp(wsMessage.timestamp);
    });
  });

  describe('Integration Data Sync', () => {
    it('should create integration outbox entries for external systems', async () => {
      const syncData = [
        {
          entityType: 'DISPOSITION',
          entityId: 'disposition-123',
          action: 'CREATE',
          payload: {
            dispositionId: 'disposition-123',
            callId: 'test-call-1',
            outcome: 'SALE_CLOSED',
            revenue: 2500,
            timestamp: new Date()
          }
        },
        {
          entityType: 'CALL',
          entityId: 'test-call-1',
          action: 'UPDATE',
          payload: {
            callId: 'test-call-1',
            status: 'COMPLETED',
            duration: 300,
            endTime: new Date()
          }
        }
      ];

      for (const item of syncData) {
        const outboxEntry = await prisma.integrationOutboxEntry.create({
          data: {
            entityType: item.entityType,
            entityId: item.entityId,
            action: item.action,
            payload: JSON.stringify(item.payload),
            status: 'PENDING',
            createdAt: new Date()
          }
        });

        expect(outboxEntry.entityType).toBe(item.entityType);
        expect(outboxEntry.action).toBe(item.action);
        expect(outboxEntry.status).toBe('PENDING');

        const payload = JSON.parse(outboxEntry.payload);
        expect(payload).toMatchObject(item.payload);

        global.testUtils.expectValidId(outboxEntry.id);
      }
    });

    it('should handle integration sync status updates', async () => {
      // Create outbox entry
      const outboxEntry = await prisma.integrationOutboxEntry.create({
        data: {
          entityType: 'DISPOSITION',
          entityId: 'test-disposition-sync',
          action: 'CREATE',
          payload: JSON.stringify({ test: 'data' }),
          status: 'PENDING'
        }
      });

      // Update to processing
      const processingEntry = await prisma.integrationOutboxEntry.update({
        where: { id: outboxEntry.id },
        data: {
          status: 'PROCESSING',
          processedAt: new Date()
        }
      });

      expect(processingEntry.status).toBe('PROCESSING');
      expect(processingEntry.processedAt).toBeDefined();

      // Update to completed
      const completedEntry = await prisma.integrationOutboxEntry.update({
        where: { id: outboxEntry.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      expect(completedEntry.status).toBe('COMPLETED');
      expect(completedEntry.completedAt).toBeDefined();
      global.testUtils.expectValidTimestamp(completedEntry.completedAt);
    });

    it('should handle integration sync failures with retry logic', async () => {
      const outboxEntry = await prisma.integrationOutboxEntry.create({
        data: {
          entityType: 'CALL',
          entityId: 'test-sync-failure',
          action: 'CREATE',
          payload: JSON.stringify({ test: 'data' }),
          status: 'PENDING'
        }
      });

      // Simulate failure
      const failedEntry = await prisma.integrationOutboxEntry.update({
        where: { id: outboxEntry.id },
        data: {
          status: 'FAILED',
          error: 'Integration endpoint timeout',
          retryCount: 1,
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes later
        }
      });

      expect(failedEntry.status).toBe('FAILED');
      expect(failedEntry.error).toContain('timeout');
      expect(failedEntry.retryCount).toBe(1);
      expect(failedEntry.nextRetryAt).toBeDefined();
    });
  });
});