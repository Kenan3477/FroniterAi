/**
 * API Route: Direct Advanced Transcript Processing (Testing)
 * Bypasses backend and calls transcription script directly
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local if not already loaded
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      const envLines = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      for (const line of envLines) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["'](.*)["']$/, '$1');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
    }
  } catch (error: any) {
    console.warn('⚠️ Could not load .env.local file:', error.message);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Call ID is required' });
  }

  // Load environment variables
  loadEnvFile();

  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    console.log(`🚀 Processing AI transcription for call: ${id}`);

    // Extract auth token from request headers
    const authHeader = req.headers.authorization;
    const authToken = authHeader?.replace('Bearer ', '') || '';

    // Send immediate response indicating processing has started
    res.status(202).json({
      success: true,
      message: '🎯 AI Transcription Started! Please wait whilst we transcribe...',
      callId: id,
      status: 'processing',
      estimatedTime: '30-60 seconds'
    });

    // Run AI transcription in background
    const scriptPath = path.join(process.cwd(), '..', 'whisper-ai-transcription-secure.js');
    
    const child = spawn('node', [scriptPath, 'single', id, authToken], {
      cwd: path.join(process.cwd(), '..'),
      env: {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      }
    });

    child.stdout.on('data', (data) => {
      console.log(`AI Transcription Output: ${data}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`AI Transcription Error: ${data}`);
    });

    child.on('close', (code) => {
      console.log(`🎯 AI Transcription completed with code: ${code}`);
      // Note: Response already sent, this is background processing
    });

  } catch (error: any) {
    console.error('❌ AI transcription failed:', error);
    
    // If response hasn't been sent yet, send error
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to start AI transcription',
        details: error.message 
      });
    }
  }
}