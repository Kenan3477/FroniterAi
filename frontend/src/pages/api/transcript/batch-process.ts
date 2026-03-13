/**
 * API Route: Start Batch Processing
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Proxy to backend - correct route path
    const backendUrl = process.env.BACKEND_URL || 'https://omnivox-dialler-production.up.railway.app';
    const response = await fetch(`${backendUrl}/api/batch-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error starting batch processing:', error);
    res.status(500).json({ 
      error: 'Failed to start batch processing',
      details: error.message 
    });
  }
}