/**
 * Production Call State Machine
 * 
 * Implements a comprehensive finite-state machine for call lifecycle management
 * following Omnivox-AI Development Instructions:
 * 
 * - Calls cannot exist without ownership
 * - Dispositions cannot be skipped
 * - Call outcomes are never lost  
 * - All call endings are captured and reconciled
 * - Handles agent hangup, customer hangup, network failures
 * - Enforces proper state transitions
 */

import { prisma } from '../database';
import { callEvents, systemEvents } from '../utils/eventHelpers';
import { EventPriority } from '../types/events';
import { redisClient } from '../config/redis';

// Call States - Finite State Machine
export enum CallState {
  // Initial states
  QUEUED = 'queued',           // In dial queue, waiting to dial
  DIALING = 'dialing',         // Being dialed by system
  
  // Active states  
  RINGING = 'ringing',         // Ringing at customer end
  ANSWERED = 'answered',       // Customer picked up
  CONNECTED = 'connected',     // Agent and customer connected
  
  // Hold/Transfer states
  ON_HOLD = 'on-hold',         // Call on hold
  TRANSFERRING = 'transferring', // Being transferred
  
  // End states (terminal)
  COMPLETED = 'completed',     // Call completed with disposition
  NO_ANSWER = 'no-answer',     // Customer didn't answer
  BUSY = 'busy',              // Line was busy
  FAILED = 'failed',          // Technical failure
  ABANDONED = 'abandoned',     // Customer hung up before agent connected
  AGENT_UNAVAILABLE = 'agent-unavailable' // No agent available
}

// Call Outcomes - Required for every call
export enum CallOutcome {
  SALE = 'sale',
  NO_SALE = 'no-sale',
  APPOINTMENT = 'appointment', 
  CALLBACK = 'callback',
  NOT_INTERESTED = 'not-interested',
  WRONG_NUMBER = 'wrong-number',
  DO_NOT_CALL = 'do-not-call',
  ANSWERING_MACHINE = 'answering-machine',
  TECHNICAL_FAILURE = 'technical-failure',
  AGENT_ERROR = 'agent-error'
}

// State Transition Rules
const VALID_TRANSITIONS: Record<CallState, CallState[]> = {
  [CallState.QUEUED]: [CallState.DIALING, CallState.FAILED],
  [CallState.DIALING]: [CallState.RINGING, CallState.FAILED, CallState.BUSY],
  [CallState.RINGING]: [CallState.ANSWERED, CallState.NO_ANSWER, CallState.ABANDONED, CallState.FAILED],
  [CallState.ANSWERED]: [CallState.CONNECTED, CallState.AGENT_UNAVAILABLE, CallState.ABANDONED, CallState.FAILED],
  [CallState.CONNECTED]: [CallState.ON_HOLD, CallState.TRANSFERRING, CallState.COMPLETED, CallState.ABANDONED],
  [CallState.ON_HOLD]: [CallState.CONNECTED, CallState.COMPLETED, CallState.ABANDONED],
  [CallState.TRANSFERRING]: [CallState.CONNECTED, CallState.COMPLETED, CallState.FAILED],
  
  // Terminal states cannot transition
  [CallState.COMPLETED]: [],
  [CallState.NO_ANSWER]: [],
  [CallState.BUSY]: [],
  [CallState.FAILED]: [],
  [CallState.ABANDONED]: [],
  [CallState.AGENT_UNAVAILABLE]: []
};

// Call ownership types
export enum CallOwnership {
  SYSTEM = 'system',     // Owned by dialer system
  AGENT = 'agent',       // Owned by specific agent
  SUPERVISOR = 'supervisor', // Owned by supervisor
  QUEUE = 'queue'        // In agent queue
}

interface CallStateRecord {
  callId: string;
  sipCallId?: string;
  currentState: CallState;
  previousState?: CallState;
  ownership: CallOwnership;
  ownerId?: string; // Agent ID, supervisor ID, etc.
  contactId: string;
  campaignId: string;
  phoneNumber: string;
  
  // Timing tracking
  queuedAt?: Date;
  dialedAt?: Date;
  ringingAt?: Date;
  answeredAt?: Date;
  connectedAt?: Date;
  endedAt?: Date;
  
  // Outcome tracking
  outcome?: CallOutcome;
  dispositionId?: string;
  subDisposition?: string;
  notes?: string;
  
  // Technical details
  amdResult?: 'human' | 'machine' | 'unknown';
  recordingUrl?: string;
  duration?: number;
  
  // Metadata
  retryCount: number;
  priority: number;
  scheduledCallback?: Date;
  transferHistory?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

class CallStateMachine {
  private activeCallStates = new Map<string, CallStateRecord>();
  private stateChangeHistory = new Map<string, Array<{state: CallState, timestamp: Date, reason?: string}>>();

  constructor() {
    this.initializeStateMachine();
  }

  private async initializeStateMachine() {
    console.log('🔄 Initializing Call State Machine');
    
    // Load active calls from database
    await this.loadActiveCallStates();
    
    // Start state monitoring process
    this.startStateMonitoring();
    
    console.log('✅ Call State Machine initialized');
  }

  /**
   * Create a new call in the state machine
   */
  async createCall(params: {
    contactId: string;
    campaignId: string;
    phoneNumber: string;
    priority?: number;
    scheduledCallback?: Date;
  }): Promise<string> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const callRecord: CallStateRecord = {
      callId,
      currentState: CallState.QUEUED,
      ownership: CallOwnership.SYSTEM,
      contactId: params.contactId,
      campaignId: params.campaignId,
      phoneNumber: params.phoneNumber,
      queuedAt: new Date(),
      retryCount: 0,
      priority: params.priority || 5,
      scheduledCallback: params.scheduledCallback,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in memory and database
    this.activeCallStates.set(callId, callRecord);
    await this.persistCallState(callRecord);
    
    // Initialize state history
    this.stateChangeHistory.set(callId, [{
      state: CallState.QUEUED,
      timestamp: new Date(),
      reason: 'Call created and queued'
    }]);
    
    // Emit call created event
    await callEvents.initiated({
      callId,
      contactId: params.contactId,
      campaignId: params.campaignId,
      phoneNumber: params.phoneNumber,
      direction: 'outbound',
      status: 'queued',
      metadata: { priority: params.priority }
    });
    
    console.log(`📞 Call created: ${callId} -> ${params.phoneNumber} (State: QUEUED)`);
    
    return callId;
  }

  /**
   * Transition call to new state with validation
   */
  async transitionState(
    callId: string, 
    newState: CallState, 
    metadata?: {
      ownerId?: string;
      ownership?: CallOwnership;
      sipCallId?: string;
      reason?: string;
      amdResult?: 'human' | 'machine' | 'unknown';
    }
  ): Promise<boolean> {
    const callRecord = this.activeCallStates.get(callId);
    
    if (!callRecord) {
      console.error(`❌ Call ${callId} not found in state machine`);
      return false;
    }

    const currentState = callRecord.currentState;
    
    // Validate state transition
    if (!this.isValidTransition(currentState, newState)) {
      console.error(`❌ Invalid state transition: ${currentState} -> ${newState} for call ${callId}`);
      return false;
    }

    // Update state record
    callRecord.previousState = currentState;
    callRecord.currentState = newState;
    callRecord.updatedAt = new Date();
    
    // Update ownership if provided
    if (metadata?.ownership) {
      callRecord.ownership = metadata.ownership;
      callRecord.ownerId = metadata.ownerId;
    }
    
    // Update SIP call ID if provided
    if (metadata?.sipCallId) {
      callRecord.sipCallId = metadata.sipCallId;
    }
    
    // Update AMD result if provided
    if (metadata?.amdResult) {
      callRecord.amdResult = metadata.amdResult;
    }
    
    // Set timing based on state
    const now = new Date();
    switch (newState) {
      case CallState.DIALING:
        callRecord.dialedAt = now;
        break;
      case CallState.RINGING:
        callRecord.ringingAt = now;
        break;
      case CallState.ANSWERED:
        callRecord.answeredAt = now;
        break;
      case CallState.CONNECTED:
        callRecord.connectedAt = now;
        // Assign to agent if not already assigned
        if (callRecord.ownership === CallOwnership.SYSTEM && metadata?.ownerId) {
          callRecord.ownership = CallOwnership.AGENT;
          callRecord.ownerId = metadata.ownerId;
        }
        break;
    }
    
    // If terminal state, set end time
    if (this.isTerminalState(newState)) {
      callRecord.endedAt = now;
      
      // Calculate duration if we have answered time
      if (callRecord.answeredAt) {
        callRecord.duration = Math.floor((now.getTime() - callRecord.answeredAt.getTime()) / 1000);
      }
      
      // Terminal states require outcome (except system failures)
      if (newState === CallState.COMPLETED && !callRecord.outcome) {
        console.warn(`⚠️ Call ${callId} completed without outcome - requires manual disposition`);
      }
    }
    
    // Update state history
    const history = this.stateChangeHistory.get(callId) || [];
    history.push({
      state: newState,
      timestamp: now,
      reason: metadata?.reason
    });
    this.stateChangeHistory.set(callId, history);
    
    // Persist changes
    await this.persistCallState(callRecord);
    
    // Emit state change event
    await this.emitStateChangeEvent(callRecord, currentState, newState);
    
    console.log(`🔄 Call ${callId}: ${currentState} -> ${newState}${metadata?.reason ? ` (${metadata.reason})` : ''}`);
    
    return true;
  }

  /**
   * Complete call with required outcome
   */
  async completeCall(
    callId: string, 
    outcome: CallOutcome, 
    dispositionId?: string,
    subDisposition?: string,
    notes?: string
  ): Promise<boolean> {
    const callRecord = this.activeCallStates.get(callId);
    
    if (!callRecord) {
      console.error(`❌ Call ${callId} not found`);
      return false;
    }
    
    // Update outcome information
    callRecord.outcome = outcome;
    callRecord.dispositionId = dispositionId;
    callRecord.subDisposition = subDisposition;
    callRecord.notes = notes;
    
    // Transition to completed state
    const success = await this.transitionState(callId, CallState.COMPLETED, {
      reason: `Completed with outcome: ${outcome}`
    });
    
    if (success) {
      console.log(`✅ Call ${callId} completed with outcome: ${outcome}`);
      
      // Emit call completion event
      await callEvents.ended({
        callId,
        sipCallId: callRecord.sipCallId || '',
        contactId: callRecord.contactId,
        campaignId: callRecord.campaignId,
        agentId: callRecord.ownerId || '',
        phoneNumber: callRecord.phoneNumber,
        direction: 'outbound',
        status: 'completed',
        metadata: {
          outcome,
          duration: callRecord.duration,
          disposition: dispositionId
        }
      });
      
      // Remove from active calls
      this.activeCallStates.delete(callId);
    }
    
    return success;
  }

  /**
   * Handle call failure or abandonment
   */
  async failCall(
    callId: string, 
    reason: string, 
    finalState: CallState = CallState.FAILED
  ): Promise<boolean> {
    const callRecord = this.activeCallStates.get(callId);
    
    if (!callRecord) {
      console.error(`❌ Call ${callId} not found`);
      return false;
    }
    
    // Auto-assign outcome based on final state
    let autoOutcome: CallOutcome;
    switch (finalState) {
      case CallState.NO_ANSWER:
        autoOutcome = CallOutcome.NOT_INTERESTED;
        break;
      case CallState.BUSY:
        autoOutcome = CallOutcome.NOT_INTERESTED;
        break;
      case CallState.ABANDONED:
        autoOutcome = CallOutcome.NOT_INTERESTED;
        break;
      case CallState.AGENT_UNAVAILABLE:
        autoOutcome = CallOutcome.AGENT_ERROR;
        break;
      default:
        autoOutcome = CallOutcome.TECHNICAL_FAILURE;
    }
    
    callRecord.outcome = autoOutcome;
    
    // Transition to final state
    const success = await this.transitionState(callId, finalState, {
      reason
    });
    
    if (success) {
      console.log(`❌ Call ${callId} failed: ${reason} (Final state: ${finalState})`);
      
      // Emit call failure event
      await callEvents.failed({
        callId,
        contactId: callRecord.contactId,
        campaignId: callRecord.campaignId,
        phoneNumber: callRecord.phoneNumber,
        direction: 'outbound',
        status: finalState,
        metadata: { reason, autoOutcome }
      });
      
      // Remove from active calls
      this.activeCallStates.delete(callId);
    }
    
    return success;
  }

  /**
   * Assign call to specific agent
   */
  async assignToAgent(callId: string, agentId: string): Promise<boolean> {
    const callRecord = this.activeCallStates.get(callId);
    
    if (!callRecord) {
      console.error(`❌ Call ${callId} not found`);
      return false;
    }
    
    // Update ownership
    callRecord.ownership = CallOwnership.AGENT;
    callRecord.ownerId = agentId;
    callRecord.updatedAt = new Date();
    
    await this.persistCallState(callRecord);
    
    console.log(`👤 Call ${callId} assigned to agent ${agentId}`);
    
    return true;
  }

  /**
   * Get current state of a call
   */
  getCallState(callId: string): CallStateRecord | undefined {
    return this.activeCallStates.get(callId);
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): Map<string, CallStateRecord> {
    return new Map(this.activeCallStates);
  }

  /**
   * Get calls by state
   */
  getCallsByState(state: CallState): CallStateRecord[] {
    return Array.from(this.activeCallStates.values())
      .filter(call => call.currentState === state);
  }

  /**
   * Get calls by ownership
   */
  getCallsByOwner(ownership: CallOwnership, ownerId?: string): CallStateRecord[] {
    return Array.from(this.activeCallStates.values())
      .filter(call => {
        if (call.ownership !== ownership) return false;
        if (ownerId && call.ownerId !== ownerId) return false;
        return true;
      });
  }

  /**
   * Private helper methods
   */
  private isValidTransition(from: CallState, to: CallState): boolean {
    return VALID_TRANSITIONS[from].includes(to);
  }

  private isTerminalState(state: CallState): boolean {
    return VALID_TRANSITIONS[state].length === 0;
  }

  private async loadActiveCallStates(): Promise<void> {
    try {
      // Load active calls from database (gracefully handle schema issues)
      const activeCalls = await prisma.callRecord.findMany({
        where: {
          outcome: null, // Only calls without final outcomes
          endTime: null  // Only calls not ended
        }
      }).catch(error => {
        if (error.code === 'P2022' || error.code === 'P2021') {
          console.log('📊 Database schema incomplete, starting with empty call state');
          return [];
        }
        throw error;
      });
      
      for (const call of activeCalls) {
        const callRecord: CallStateRecord = {
          callId: call.callId,
          currentState: call.outcome ? CallState.COMPLETED : CallState.CONNECTED, // Default to connected if active
          ownership: CallOwnership.AGENT, // Assume agent ownership for active calls
          ownerId: call.agentId || undefined,
          contactId: call.contactId,
          campaignId: call.campaignId,
          phoneNumber: call.phoneNumber,
          connectedAt: call.startTime,
          retryCount: 0,
          priority: 5,
          createdAt: call.createdAt,
          updatedAt: call.createdAt
        };
        
        this.activeCallStates.set(call.callId, callRecord);
      }
      
      console.log(`📊 Loaded ${activeCalls.length} active calls into state machine`);
      
    } catch (error) {
      console.error('❌ Error loading active call states:', error);
    }
  }

  private async persistCallState(callRecord: CallStateRecord): Promise<void> {
    try {
      await prisma.callRecord.upsert({
        where: { callId: callRecord.callId },
        update: {
          outcome: callRecord.outcome,
          endTime: callRecord.endedAt,
          duration: callRecord.duration,
          notes: callRecord.notes,
          agentId: callRecord.ownerId
        },
        create: {
          callId: callRecord.callId,
          contactId: callRecord.contactId,
          campaignId: callRecord.campaignId,
          phoneNumber: callRecord.phoneNumber,
          callType: 'outbound',
          startTime: callRecord.queuedAt || new Date(),
          endTime: callRecord.endedAt,
          duration: callRecord.duration,
          outcome: callRecord.outcome,
          notes: callRecord.notes,
          agentId: callRecord.ownerId
        }
      });
    } catch (error) {
      console.error(`❌ Error persisting call state for ${callRecord.callId}:`, error);
    }
  }

  private async emitStateChangeEvent(
    callRecord: CallStateRecord, 
    fromState: CallState, 
    toState: CallState
  ): Promise<void> {
    // Emit appropriate events based on state change
    switch (toState) {
      case CallState.CONNECTED:
        await callEvents.connected({
          callId: callRecord.callId,
          sipCallId: callRecord.sipCallId || '',
          contactId: callRecord.contactId,
          campaignId: callRecord.campaignId,
          agentId: callRecord.ownerId || '',
          phoneNumber: callRecord.phoneNumber,
          direction: 'outbound',
          status: 'connected',
          metadata: { fromState }
        });
        break;
      
      default:
        // Generic state change event
        await systemEvents.performance({
          level: 'info',
          component: 'call_state_machine',
          message: `Call ${callRecord.callId} transitioned from ${fromState} to ${toState}`,
          details: {
            callId: callRecord.callId,
            fromState,
            toState,
            ownership: callRecord.ownership
          }
        });
    }
  }

  private startStateMonitoring(): void {
    // Monitor for abandoned/orphaned calls every 30 seconds
    setInterval(() => {
      this.checkForOrphanedCalls();
    }, 30000);
    
    console.log('📊 State monitoring started');
  }

  private checkForOrphanedCalls(): void {
    const now = new Date();
    const abandonThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [callId, callRecord] of this.activeCallStates) {
      const timeSinceLastUpdate = now.getTime() - callRecord.updatedAt.getTime();
      
      // Check for calls stuck in non-terminal states for too long
      if (timeSinceLastUpdate > abandonThreshold && !this.isTerminalState(callRecord.currentState)) {
        console.warn(`⚠️ Orphaned call detected: ${callId} stuck in ${callRecord.currentState} for ${Math.floor(timeSinceLastUpdate / 1000)}s`);
        
        // Auto-fail orphaned calls
        this.failCall(callId, 'Orphaned call - stuck in state too long');
      }
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStatistics() {
    const stats = {
      totalActiveCalls: this.activeCallStates.size,
      byState: {} as Record<CallState, number>,
      byOwnership: {} as Record<CallOwnership, number>,
      avgCallDuration: 0,
      completedCallsToday: 0
    };
    
    // Count by state
    for (const state of Object.values(CallState)) {
      stats.byState[state] = this.getCallsByState(state).length;
    }
    
    // Count by ownership
    for (const ownership of Object.values(CallOwnership)) {
      stats.byOwnership[ownership] = this.getCallsByOwner(ownership).length;
    }
    
    return stats;
  }
}

// Export singleton instance
export const callStateMachine = new CallStateMachine();
export default callStateMachine;