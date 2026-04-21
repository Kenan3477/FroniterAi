import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { callId } = req.query;
  
  if (!callId || typeof callId !== 'string') {
    return res.status(400).json({ error: 'Call ID is required' });
  }

  try {
    console.log('🎯 Starting Advanced AI Transcription for call:', callId);

    // Path to the enhanced transcription script
    const scriptPath = path.join(process.cwd(), 'enhanced-whisper-diarization.js');
    
    // Spawn the transcription process
    const transcriptionProcess = spawn('node', [scriptPath, callId], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    transcriptionProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('📝 Transcription output:', data.toString());
    });

    transcriptionProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('❌ Transcription error:', data.toString());
    });

    // Don't wait for the process to complete - return immediately
    res.status(200).json({
      success: true,
      message: 'Advanced AI transcription started',
      callId,
      processing: true,
      estimatedCompletion: new Date(Date.now() + 60000).toISOString() // Estimate 1 minute
    });

    // Handle process completion in the background
    transcriptionProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Advanced AI transcription completed for call:', callId);
      } else {
        console.error('❌ Advanced AI transcription failed for call:', callId, 'Exit code:', code);
      }
    });

    transcriptionProcess.on('error', (error) => {
      console.error('❌ Process spawn error:', error);
    });

  } catch (error) {
    console.error('❌ Error starting advanced transcription:', error);
    return res.status(500).json({ 
      error: 'Failed to start advanced AI transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}