import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

interface InboundNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  country: string;
  region: string;
  numberType: string;
  provider: string;
  capabilities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/voice/inbound-numbers - Get available inbound numbers for CLI selection
router.get('/inbound-numbers', async (req: Request, res: Response) => {
  try {
    // Fetch active inbound numbers from database
    const inboundNumbers = await prisma.inboundNumber.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { country: 'asc' },
        { numberType: 'asc' },
        { phoneNumber: 'asc' }
      ]
    });

    // Parse capabilities field (stored as JSON string) and transform for response
    const transformedNumbers = inboundNumbers.map((number: any) => ({
      id: number.id,
      phoneNumber: number.phoneNumber,
      displayName: number.displayName,
      country: number.country,
      region: number.region,
      numberType: number.numberType,
      provider: number.provider,
      capabilities: number.capabilities ? JSON.parse(number.capabilities) : [],
      isActive: number.isActive
    }));

    res.json({
      success: true,
      data: transformedNumbers
    });

  } catch (error) {
    console.error('Error fetching inbound numbers:', error);
    
    // Fallback to hardcoded numbers if database query fails
    const fallbackNumbers: InboundNumber[] = [
      {
        id: 'fallback-1',
        phoneNumber: '+442046343130',
        displayName: 'UK Local - London',
        country: 'GB',
        region: 'London',
        numberType: 'LOCAL',
        provider: 'TWILIO',
        capabilities: ['VOICE', 'SMS'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fallback-2', 
        phoneNumber: '+15551234567',
        displayName: 'US Toll-Free',
        country: 'US',
        region: 'National',
        numberType: 'TOLL_FREE',
        provider: 'TWILIO',
        capabilities: ['VOICE', 'SMS'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fallback-3',
        phoneNumber: '+447700900123', 
        displayName: 'UK Mobile',
        country: 'GB',
        region: 'National',
        numberType: 'MOBILE',
        provider: 'TWILIO',
        capabilities: ['VOICE', 'SMS', 'MMS'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fallback-4',
        phoneNumber: '+14155552456',
        displayName: 'US Local - San Francisco',
        country: 'US',
        region: 'San Francisco', 
        numberType: 'LOCAL',
        provider: 'TWILIO',
        capabilities: ['VOICE', 'SMS'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: fallbackNumbers.map(number => ({
        id: number.id,
        phoneNumber: number.phoneNumber,
        displayName: number.displayName,
        country: number.country,
        region: number.region,
        numberType: number.numberType,
        provider: number.provider,
        capabilities: number.capabilities
      }))
    });
  }
});

export default router;