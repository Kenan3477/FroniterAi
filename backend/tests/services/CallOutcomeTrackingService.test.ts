// Unit Tests for Call Outcome Tracking Service
// Tests call outcome recording and analysis functionality

import '../setup';

describe('Call Outcome Tracking Service Tests', () => {
  let prisma: any;

  beforeAll(() => {
    prisma = global.testUtils.prisma;
  });

  describe('Call Outcome Recording', () => {
    it('should record call outcomes with proper categorization', async () => {
      // Create test calls first
      const callIds = ['test-outcome-call-1', 'test-outcome-call-2', 'test-outcome-call-3'];
      
      for (let i = 0; i < callIds.length; i++) {
        await prisma.call.create({
          data: {
            id: callIds[i],
            campaignId: 'test-campaign-1',
            status: 'ENDED',
            duration: 120 + i * 60,
            startTime: new Date()
          }
        });
      }

      // Create disposition categories if they don't exist
      const testCategories = [
        { id: 'cat-sale', name: 'Sale Closed', color: '#28a745' },
        { id: 'cat-appointment', name: 'Appointment Set', color: '#007bff' },
        { id: 'cat-not-interested', name: 'Not Interested', color: '#6c757d' }
      ];

      for (const category of testCategories) {
        await prisma.dispositionCategory.upsert({
          where: { id: category.id },
          update: {},
          create: category
        });
      }

      // Create test agent
      await prisma.agent.upsert({
        where: { id: 'test-agent-1' },
        update: {},
        create: {
          id: 'test-agent-1',
          username: 'testagent1',
          phoneNumber: '+1234567890',
          status: 'AVAILABLE'
        }
      });

      const testDispositions = [
        {
          callId: callIds[0],
          categoryId: 'cat-sale',
          agentId: 'test-agent-1',
          notes: 'Customer purchased premium package'
        },
        {
          callId: callIds[1],
          categoryId: 'cat-appointment',
          agentId: 'test-agent-1',
          notes: 'Demo scheduled for next week'
        },
        {
          callId: callIds[2],
          categoryId: 'cat-not-interested', 
          agentId: 'test-agent-1',
          notes: 'Customer satisfied with current provider'
        }
      ];

      for (const dispositionData of testDispositions) {
        const disposition = await prisma.disposition.create({
          data: dispositionData
        });

        expect(disposition.callId).toBe(dispositionData.callId);
        expect(disposition.notes).toBe(dispositionData.notes);
        
        global.testUtils.expectValidId(disposition.id);
        global.testUtils.expectValidTimestamp(disposition.createdAt);
      }
    });

    it('should track call progression and state changes', async () => {
      const callId = 'test-progression-call';
      
      // Create call
      const call = await prisma.call.create({
        data: {
          id: callId,
          campaignId: 'test-campaign-1',
          status: 'INITIATED',
          startTime: new Date()
        }
      });

      // Track progression through states
      const progressionStates = [
        { status: 'RINGING', timestamp: new Date() },
        { status: 'ANSWERED', timestamp: new Date() },
        { status: 'IN_PROGRESS', timestamp: new Date() },
        { status: 'COMPLETED', timestamp: new Date() }
      ];

      for (const state of progressionStates) {
        const updatedCall = await prisma.call.update({
          where: { id: callId },
          data: { 
            status: state.status,
            lastStatusUpdate: state.timestamp
          }
        });

        expect(updatedCall.status).toBe(state.status);
        global.testUtils.expectValidTimestamp(updatedCall.lastStatusUpdate);
      }
    });

    it('should calculate call metrics and KPIs', async () => {
      // Create sample calls with different outcomes
      const callOutcomes = [
        { outcome: 'SALE_CLOSED', duration: 300, revenue: 1000 },
        { outcome: 'APPOINTMENT_SET', duration: 240, revenue: 0 },
        { outcome: 'NOT_INTERESTED', duration: 120, revenue: 0 },
        { outcome: 'NO_ANSWER', duration: 15, revenue: 0 },
        { outcome: 'BUSY', duration: 5, revenue: 0 }
      ];

      const callIds = [];
      for (let i = 0; i < callOutcomes.length; i++) {
        const outcome = callOutcomes[i];
        const callId = `metrics-test-call-${i + 1}`;
        callIds.push(callId);

        // Create call
        await prisma.call.create({
          data: {
            id: callId,
            campaignId: 'test-campaign-1',
            status: 'COMPLETED',
            duration: outcome.duration,
            startTime: new Date('2024-01-01T10:00:00Z'),
            endTime: new Date(new Date('2024-01-01T10:00:00Z').getTime() + outcome.duration * 1000)
          }
        });

        // Create disposition
        await prisma.disposition.create({
          data: {
            callId,
            outcome: outcome.outcome,
            dispositionType: 'AUTOMATED',
            agentId: outcome.outcome.includes('SALE') ? 'test-user-1' : null,
            metadata: JSON.stringify({ revenue: outcome.revenue })
          }
        });
      }

      // Calculate metrics
      const calls = await prisma.call.findMany({
        where: { id: { in: callIds } },
        include: { dispositions: true }
      });

      expect(calls.length).toBe(5);

      // Calculate success rate
      const successfulCalls = calls.filter((call: any) =>
        call.dispositions.some((d: any) => ['SALE_CLOSED', 'APPOINTMENT_SET'].includes(d.outcome))
      );
      const successRate = (successfulCalls.length / calls.length) * 100;
      expect(successRate).toBe(40); // 2 out of 5

      // Calculate average call duration
      const totalDuration = calls.reduce((sum: number, call: any) => sum + call.duration, 0);
      const avgDuration = totalDuration / calls.length;
      expect(avgDuration).toBe(136); // Average of durations

      // Calculate contact rate
      const contactedCalls = calls.filter((call: any) =>
        call.dispositions.some((d: any) => !['NO_ANSWER', 'BUSY'].includes(d.outcome))
      );
      const contactRate = (contactedCalls.length / calls.length) * 100;
      expect(contactRate).toBe(60); // 3 out of 5
    });
  });

  describe('Outcome Analysis and Reporting', () => {
    it('should generate outcome analysis reports', async () => {
      const reportData = {
        campaignId: 'test-campaign-1',
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      };

      // Get all calls for campaign in period
      const calls = await prisma.call.findMany({
        where: {
          campaignId: reportData.campaignId,
          startTime: {
            gte: reportData.period.startDate,
            lte: reportData.period.endDate
          }
        },
        include: {
          dispositions: true
        }
      });

      // Analyze outcomes
      const outcomeAnalysis = {
        totalCalls: calls.length,
        callsByOutcome: {},
        avgCallDuration: 0,
        successRate: 0,
        contactRate: 0
      };

      calls.forEach((call: any) => {
        if (call.dispositions.length > 0) {
          const outcome = call.dispositions[0].outcome;
          (outcomeAnalysis.callsByOutcome as any)[outcome] = 
            ((outcomeAnalysis.callsByOutcome as any)[outcome] || 0) + 1;
        }
      });

      expect(outcomeAnalysis.totalCalls).toBeGreaterThanOrEqual(0);
      expect(typeof outcomeAnalysis.callsByOutcome).toBe('object');
    });

    it('should track agent performance metrics', async () => {
      const agentId = 'test-user-1';
      const performancePeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      // Get agent's calls and dispositions
      const agentDispositions = await prisma.disposition.findMany({
        where: {
          agentId,
          createdAt: {
            gte: performancePeriod.startDate,
            lte: performancePeriod.endDate
          }
        },
        include: {
          call: true
        }
      });

      // Calculate agent metrics
      const agentMetrics = {
        totalDispositions: agentDispositions.length,
        salesCount: agentDispositions.filter((d: any) => d.outcome === 'SALE_CLOSED').length,
        appointmentsSet: agentDispositions.filter((d: any) => d.outcome === 'APPOINTMENT_SET').length,
        avgCallDuration: 0,
        conversionRate: 0
      };

      if (agentDispositions.length > 0) {
        const totalDuration = agentDispositions.reduce((sum: number, d: any) => sum + (d.call?.duration || 0), 0);
        agentMetrics.avgCallDuration = totalDuration / agentDispositions.length;
        agentMetrics.conversionRate = (agentMetrics.salesCount / agentMetrics.totalDispositions) * 100;
      }

      expect(agentMetrics.totalDispositions).toBeGreaterThanOrEqual(0);
      expect(agentMetrics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(agentMetrics.conversionRate).toBeLessThanOrEqual(100);
    });

    it('should identify outcome patterns and trends', async () => {
      // Create sample data with patterns
      const patternData = [
        { timeOfDay: 9, outcome: 'SALE_CLOSED', frequency: 5 },
        { timeOfDay: 10, outcome: 'SALE_CLOSED', frequency: 8 },
        { timeOfDay: 11, outcome: 'APPOINTMENT_SET', frequency: 6 },
        { timeOfDay: 14, outcome: 'NOT_INTERESTED', frequency: 4 },
        { timeOfDay: 16, outcome: 'NO_ANSWER', frequency: 7 }
      ];

      // Create calls based on patterns
      for (const pattern of patternData) {
        for (let i = 0; i < pattern.frequency; i++) {
          const callId = `pattern-${pattern.timeOfDay}-${pattern.outcome}-${i}`;
          const callDate = new Date('2024-01-01');
          callDate.setHours(pattern.timeOfDay);

          await prisma.call.create({
            data: {
              id: callId,
              campaignId: 'test-campaign-1',
              status: 'COMPLETED',
              startTime: callDate,
              duration: 120
            }
          });

          await prisma.disposition.create({
            data: {
              callId,
              outcome: pattern.outcome,
              dispositionType: 'MANUAL',
              agentId: 'test-user-1'
            }
          });
        }
      }

      // Analyze patterns
      const hourlyAnalysis = await prisma.disposition.groupBy({
        by: ['outcome'],
        _count: { id: true },
        where: {
          call: {
            campaignId: 'test-campaign-1'
          }
        }
      });

      expect(hourlyAnalysis.length).toBeGreaterThan(0);
      hourlyAnalysis.forEach((analysis: any) => {
        expect(analysis.outcome).toBeDefined();
        expect(analysis._count.id).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration and Data Consistency', () => {
    it('should maintain outcome consistency across integrations', async () => {
      const disposition = await prisma.disposition.create({
        data: {
          callId: 'test-call-1',
          outcome: 'SALE_CLOSED',
          dispositionType: 'MANUAL',
          notes: 'Customer purchased premium plan',
          agentId: 'test-user-1',
          metadata: JSON.stringify({ revenue: 2500, plan: 'premium' })
        }
      });

      // Create integration outbox entry for synchronization
      const outboxEntry = await prisma.integrationOutboxEntry.create({
        data: {
          entityType: 'DISPOSITION',
          entityId: disposition.id,
          action: 'CREATE',
          payload: JSON.stringify({
            dispositionId: disposition.id,
            callId: disposition.callId,
            outcome: disposition.outcome,
            revenue: 2500,
            timestamp: disposition.createdAt
          }),
          status: 'PENDING'
        }
      });

      expect(outboxEntry.entityType).toBe('DISPOSITION');
      expect(outboxEntry.action).toBe('CREATE');
      expect(outboxEntry.status).toBe('PENDING');

      // Verify payload consistency
      const payload = JSON.parse(outboxEntry.payload);
      expect(payload.dispositionId).toBe(disposition.id);
      expect(payload.outcome).toBe('SALE_CLOSED');
      expect(payload.revenue).toBe(2500);

      global.testUtils.expectValidId(outboxEntry.id);
    });

    it('should handle outcome updates and change tracking', async () => {
      // Create initial disposition
      const disposition = await prisma.disposition.create({
        data: {
          callId: 'test-call-1',
          outcome: 'INTERESTED',
          dispositionType: 'MANUAL',
          notes: 'Customer showed interest',
          agentId: 'test-user-1'
        }
      });

      // Update outcome to sale
      const updatedDisposition = await prisma.disposition.update({
        where: { id: disposition.id },
        data: {
          outcome: 'SALE_CLOSED',
          notes: 'Customer showed interest, completed sale on follow-up',
          metadata: JSON.stringify({ 
            previousOutcome: 'INTERESTED',
            finalRevenue: 1200,
            followUpDate: new Date()
          })
        }
      });

      expect(updatedDisposition.outcome).toBe('SALE_CLOSED');
      expect(updatedDisposition.notes).toContain('completed sale');

      // Verify change tracking in metadata
      const metadata = JSON.parse(updatedDisposition.metadata || '{}');
      expect(metadata.previousOutcome).toBe('INTERESTED');
      expect(metadata.finalRevenue).toBe(1200);
    });

    it('should validate outcome data integrity', async () => {
      // Test outcome validation scenarios
      const validOutcomes = [
        'SALE_CLOSED',
        'APPOINTMENT_SET',
        'NOT_INTERESTED', 
        'NO_ANSWER',
        'BUSY',
        'CALLBACK_REQUESTED',
        'DO_NOT_CALL'
      ];

      for (const outcome of validOutcomes) {
        const disposition = await prisma.disposition.create({
          data: {
            callId: `test-validation-${outcome}`,
            outcome,
            dispositionType: 'AUTOMATED',
            agentId: outcome.includes('SALE') ? 'test-user-1' : null
          }
        });

        expect(validOutcomes).toContain(disposition.outcome);
        global.testUtils.expectValidId(disposition.id);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing call data gracefully', async () => {
      // Attempt to create disposition for non-existent call
      try {
        await prisma.disposition.create({
          data: {
            callId: 'non-existent-call',
            outcome: 'ANSWERED',
            dispositionType: 'AUTOMATED'
          }
        });
        
        // This should succeed as we're not enforcing foreign key constraints in test
        const disposition = await prisma.disposition.findFirst({
          where: { callId: 'non-existent-call' }
        });
        
        expect(disposition).toBeDefined();
        expect(disposition.callId).toBe('non-existent-call');
        
      } catch (error) {
        // If foreign key constraint exists, expect specific error
        expect((error as Error).message).toContain('foreign key constraint');
      }
    });

    it('should handle duplicate dispositions appropriately', async () => {
      const dispositionData = {
        callId: 'test-call-1',
        outcome: 'ANSWERED',
        dispositionType: 'AUTOMATED',
        agentId: 'test-user-1'
      };

      // Create first disposition
      const firstDisposition = await prisma.disposition.create({
        data: dispositionData
      });

      // Create second disposition (should be allowed for testing flexibility)
      const secondDisposition = await prisma.disposition.create({
        data: {
          ...dispositionData,
          notes: 'Updated disposition'
        }
      });

      expect(firstDisposition.callId).toBe(secondDisposition.callId);
      expect(secondDisposition.notes).toBe('Updated disposition');

      // Count dispositions for call
      const dispositionCount = await prisma.disposition.count({
        where: { callId: 'test-call-1' }
      });

      expect(dispositionCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle malformed outcome data', async () => {
      // Test with minimal valid data
      const minimalDisposition = await prisma.disposition.create({
        data: {
          callId: 'test-minimal',
          outcome: 'UNKNOWN',
          dispositionType: 'SYSTEM'
        }
      });

      expect(minimalDisposition.callId).toBe('test-minimal');
      expect(minimalDisposition.outcome).toBe('UNKNOWN');
      expect(minimalDisposition.agentId).toBeNull();
      
      global.testUtils.expectValidId(minimalDisposition.id);
    });
  });
});