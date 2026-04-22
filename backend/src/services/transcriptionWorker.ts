/**
 * TEMPORARILY DISABLED Transcription Worker Service
 * - userSession table not in current Prisma schema
 * - transcriptionStatus field not in current schema
 * 
 * Using direct AI transcription through frontend API routes instead
 */
import { prisma } from '../lib/prisma';


export interface JobProgress {
  stage: string;
  progress: number;
  details?: string;
}

export interface TranscriptionJobData {
  callId: string;
  recordingUrl: string;
  priority?: number;
}

export class TranscriptionWorker {
  constructor() {
    console.log('⚠️ TranscriptionWorker: Disabled due to schema incompatibility');
  }

  async addTranscriptionJob(callId: string, recordingUrl: string, options?: any): Promise<any> {
    console.log('⚠️ TranscriptionWorker: addTranscriptionJob disabled');
    return { id: 'disabled', callId };
  }

  async getQueueStats(): Promise<any> {
    console.log('⚠️ TranscriptionWorker: getQueueStats disabled');
    return { active: 0, waiting: 0, completed: 0, failed: 0 };
  }

  async startHistoricalBackfill(options?: any): Promise<any> {
    console.log('⚠️ TranscriptionWorker: startHistoricalBackfill disabled');
    return { processed: 0, failed: 0, skipped: 0 };
  }

  async shutdown(): Promise<void> {
    console.log('⚠️ TranscriptionWorker: shutdown (no-op)');
  }
}

export const transcriptionWorker = new TranscriptionWorker();

export async function onNewCallRecording(callId: string, recordingUrl: string): Promise<void> {
  console.log('⚠️ onNewCallRecording: disabled');
}

export const transcriptionQueue = null;
