/**
 * API Route: Batch Processing Status
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Proxy to backend - correct route path
    const backendUrl = process.env.BACKEND_URL || 'https://omnivox-dialler-production.up.railway.app';
    const response = await fetch(`${backendUrl}/api/batch-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error getting batch status:', error);
    res.status(500).json({ 
      error: 'Failed to get batch status',
      details: error.message 
    });
  }
}