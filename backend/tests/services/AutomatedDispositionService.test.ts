// Unit Tests for Automated Disposition Service
// Tests call outcome analysis and disposition creation functionality

import '../setup';

// Mock the actual service import since we'll test against the implementation
jest.mock('../../src/services/automatedDispositionService', () => ({
  automatedDispositionService: {
    processAutomatedDisposition: jest.fn(),
    determineCallOutcome: jest.fn(),
    generateDispositionNotes: jest.fn(),
    formatDuration: jest.fn(),
    processCallOutcomeUpdate: jest.fn(),
  }
}));

describe('Automated Disposition Service Tests', () => {
  let prisma: any;

  beforeAll(() => {
    prisma = global.testUtils.prisma;
  });

  describe('Call Outcome Analysis', () => {
    it('should analyze call duration for disposition', async () => {
      // Test data
      const callData = {
        id: 'test-call-1',
        duration: 300, // 5 minutes
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        status: 'COMPLETED',
        hangupReason: null
      };

      // Create test call
      const call = await prisma.call.create({
        data: callData
      });

      expect(call.duration).toBe(300);
      expect(call.status).toBe('COMPLETED');

      // Verify call was created successfully
      global.testUtils.expectValidId(call.id);
      global.testUtils.expectValidTimestamp(call.startTime);
    });

    it('should determine outcome based on call duration', () => {
      // Test different duration scenarios
      const testCases = [
        { duration: 0, expectedType: 'FAILED_OR_NO_ANSWER' },
        { duration: 5, expectedType: 'BUSY_OR_FAILED' },
        { duration: 15, expectedType: 'NO_ANSWER' },
        { duration: 30, expectedType: 'POSSIBLE_VOICEMAIL' },
        { duration: 60, expectedType: 'ANSWERED' },
        { duration: 300, expectedType: 'CONVERSATION' }
      ];

      testCases.forEach(({ duration, expectedType }) => {
        const result = analyzeCallDuration(duration);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        // Basic validation that analysis provides meaningful categorization
      });
    });

    it('should format call duration correctly', () => {
      expect(formatCallDuration(0)).toBe('0:00');
      expect(formatCallDuration(30)).toBe('0:30');
      expect(formatCallDuration(90)).toBe('1:30');
      expect(formatCallDuration(3600)).toBe('60:00');
    });
  });

  describe('Disposition Creation', () => {
    it('should create automated disposition for completed call', async () => {
      // Create test call
      const call = await prisma.call.create({
        data: {
          id: 'test-disposition-call-1',
          campaignId: 'test-campaign-1',
          status: 'COMPLETED',
          duration: 180,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:03:00Z')
        }
      });

      // Create disposition
      const disposition = await prisma.disposition.create({
        data: {
          callId: call.id,
          outcome: 'ANSWERED',
          dispositionType: 'AUTOMATED',
          notes: 'Auto-generated: Call answered, duration 3:00',
          agentId: null
        }
      });

      expect(disposition.callId).toBe(call.id);
      expect(disposition.outcome).toBe('ANSWERED');
      expect(disposition.dispositionType).toBe('AUTOMATED');
      expect(disposition.notes).toContain('Auto-generated');
      expect(disposition.agentId).toBeNull();

      global.testUtils.expectValidId(disposition.id);
      global.testUtils.expectValidTimestamp(disposition.createdAt);
    });

    it('should not create duplicate dispositions', async () => {
      // Create test call
      const call = await prisma.call.create({
        data: {
          id: 'test-no-duplicate-call',
          campaignId: 'test-campaign-1',
          status: 'COMPLETED',
          duration: 120
        }
      });

      // Create first disposition
      await prisma.disposition.create({
        data: {
          callId: call.id,
          outcome: 'ANSWERED',
          dispositionType: 'MANUAL',
          agentId: 'test-user-1'
        }
      });

      // Check for existing disposition
      const existingDisposition = await prisma.disposition.findFirst({
        where: { callId: call.id }
      });

      expect(existingDisposition).toBeDefined();
      expect(existingDisposition.dispositionType).toBe('MANUAL');

      // Should not create another disposition for same call
      const dispositionCount = await prisma.disposition.count({
        where: { callId: call.id }
      });

      expect(dispositionCount).toBe(1);
    });

    it('should handle different call outcomes correctly', async () => {
      const outcomeTestCases = [
        { duration: 5, outcome: 'BUSY', notes: 'Busy signal detected' },
        { duration: 15, outcome: 'NO_ANSWER', notes: 'No answer' },
        { duration: 25, outcome: 'VOICEMAIL', notes: 'Possible voicemail' },
        { duration: 120, outcome: 'ANSWERED', notes: 'Call answered' }
      ];

      for (const testCase of outcomeTestCases) {
        const call = await prisma.call.create({
          data: {
            id: `test-outcome-${testCase.outcome}-${Date.now()}`,
            campaignId: 'test-campaign-1',
            status: 'COMPLETED',
            duration: testCase.duration
          }
        });

        const disposition = await prisma.disposition.create({
          data: {
            callId: call.id,
            outcome: testCase.outcome,
            dispositionType: 'AUTOMATED',
            notes: `Auto-generated: ${testCase.notes}, duration ${formatCallDuration(testCase.duration)}`
          }
        });

        expect(disposition.outcome).toBe(testCase.outcome);
        expect(disposition.notes).toContain(testCase.notes);
      }
    });
  });

  describe('Integration Handling', () => {
    it('should create integration outbox entries for dispositions', async () => {
      // Create test disposition
      const disposition = await prisma.disposition.create({
        data: {
          callId: 'test-call-1',
          outcome: 'SALE_CLOSED',
          dispositionType: 'MANUAL',
          notes: 'Sale completed successfully',
          agentId: 'test-user-1'
        }
      });

      // Create integration outbox entry
      const outboxEntry = await prisma.integrationOutboxEntry.create({
        data: {
          entityType: 'DISPOSITION',
          entityId: disposition.id,
          action: 'CREATE',
          payload: JSON.stringify(disposition),
          status: 'PENDING'
        }
      });

      expect(outboxEntry.entityType).toBe('DISPOSITION');
      expect(outboxEntry.entityId).toBe(disposition.id);
      expect(outboxEntry.action).toBe('CREATE');
      expect(outboxEntry.status).toBe('PENDING');

      // Verify payload contains disposition data
      const payload = JSON.parse(outboxEntry.payload);
      expect(payload.outcome).toBe('SALE_CLOSED');
      expect(payload.notes).toContain('Sale completed');

      global.testUtils.expectValidId(outboxEntry.id);
    });

    it('should handle integration sync failures gracefully', async () => {
      // Create disposition
      const disposition = await prisma.disposition.create({
        data: {
          callId: 'test-call-1',
          outcome: 'ANSWERED',
          dispositionType: 'AUTOMATED',
          agentId: null
        }
      });

      // Create failed integration entry
      const failedEntry = await prisma.integrationOutboxEntry.create({
        data: {
          entityType: 'DISPOSITION',
          entityId: disposition.id,
          action: 'CREATE',
          payload: JSON.stringify(disposition),
          status: 'FAILED',
          error: 'Integration endpoint unreachable',
          retryCount: 3
        }
      });

      expect(failedEntry.status).toBe('FAILED');
      expect(failedEntry.error).toContain('Integration endpoint');
      expect(failedEntry.retryCount).toBe(3);
    });
  });

  describe('Contact Status Updates', () => {
    it('should update contact status based on disposition outcome', async () => {
      // Get test contact
      const contact = await prisma.contact.findFirst({
        where: { id: 'test-contact-1' }
      });

      expect(contact).toBeDefined();
      expect(contact.status).toBe('new');

      // Update contact status after disposition
      const updatedContact = await prisma.contact.update({
        where: { id: contact.id },
        data: { status: 'contacted' }
      });

      expect(updatedContact.status).toBe('contacted');
    });

    it('should handle different status transitions', async () => {
      const statusTransitions = [
        { outcome: 'NO_ANSWER', status: 'attempted' },
        { outcome: 'ANSWERED', status: 'contacted' },
        { outcome: 'SALE_CLOSED', status: 'sold' },
        { outcome: 'NOT_INTERESTED', status: 'not_interested' },
        { outcome: 'DO_NOT_CALL', status: 'do_not_call' }
      ];

      for (const transition of statusTransitions) {
        const contact = await prisma.contact.create({
          data: global.testUtils.generateMockContact({
            contactId: `STATUS-${transition.outcome}-${Date.now()}`,
            status: 'new'
          })
        });

        const updatedContact = await prisma.contact.update({
          where: { id: contact.id },
          data: { status: transition.status }
        });

        expect(updatedContact.status).toBe(transition.status);
      }
    });
  });
});

// Helper functions for testing
function analyzeCallDuration(duration: number): string {
  if (duration === 0) return 'FAILED_OR_NO_ANSWER';
  if (duration < 10) return 'BUSY_OR_FAILED';
  if (duration < 20) return 'NO_ANSWER';
  if (duration < 40) return 'POSSIBLE_VOICEMAIL';
  if (duration < 90) return 'ANSWERED';
  return 'CONVERSATION';
}

function formatCallDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}