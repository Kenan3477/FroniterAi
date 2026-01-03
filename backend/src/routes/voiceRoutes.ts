import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

interface InboundNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  description?: string;
  country: string;
  region: string;
  numberType: string;
  provider: string;
  capabilities: string[];
  isActive: boolean;
  greetingAudioUrl?: string;
  noAnswerAudioUrl?: string;
  outOfHoursAudioUrl?: string;
  busyAudioUrl?: string;
  voicemailAudioUrl?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessDays?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/voice/inbound-numbers - Get available inbound numbers for CLI selection
router.get('/inbound-numbers', authenticate, async (req: Request, res: Response) => {
  try {
    // Fetch active inbound numbers from database
    const inboundNumbers = await prisma.inboundNumber.findMany({
      where: {
        isActive: true
      },
      include: {
        assignedFlow: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      } as any,
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
      description: number.description,
      country: number.country,
      region: number.region,
      numberType: number.numberType,
      provider: number.provider,
      capabilities: number.capabilities ? JSON.parse(number.capabilities) : [],
      isActive: number.isActive,
      greetingAudioUrl: number.greetingAudioUrl,
      noAnswerAudioUrl: number.noAnswerAudioUrl,
      outOfHoursAudioUrl: number.outOfHoursAudioUrl,
      busyAudioUrl: number.busyAudioUrl,
      voicemailAudioUrl: number.voicemailAudioUrl,
      businessHoursStart: number.businessHoursStart,
      businessHoursEnd: number.businessHoursEnd,
      businessDays: number.businessDays,
      timezone: number.timezone,
      assignedFlowId: number.assignedFlowId,
      assignedFlow: number.assignedFlow,
      createdAt: number.createdAt,
      updatedAt: number.updatedAt
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

// PUT /api/voice/inbound-numbers/:id - Update an inbound number configuration
router.put('/inbound-numbers/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      description,
      greetingAudioUrl,
      noAnswerAudioUrl,
      outOfHoursAudioUrl,
      busyAudioUrl,
      voicemailAudioUrl,
      businessHoursStart,
      businessHoursEnd,
      businessDays,
      timezone,
      isActive,
      assignedFlowId
    } = req.body;

    // Validate flow exists if assignedFlowId is provided
    if (assignedFlowId) {
      const flow = await prisma.flow.findUnique({
        where: { id: assignedFlowId }
      });
      if (!flow) {
        return res.status(400).json({
          success: false,
          error: 'Assigned flow not found'
        });
      }
    }

    // Update the inbound number in the database
    const updatedNumber: any = await prisma.inboundNumber.update({
      where: { id },
      data: {
        displayName,
        description,
        greetingAudioUrl,
        noAnswerAudioUrl,
        outOfHoursAudioUrl,
        busyAudioUrl,
        voicemailAudioUrl,
        businessHoursStart,
        businessHoursEnd,
        businessDays,
        timezone,
        isActive,
        assignedFlowId: assignedFlowId || null,
        updatedAt: new Date()
      } as any,
      include: {
        assignedFlow: assignedFlowId ? {
          select: {
            id: true,
            name: true,
            status: true
          }
        } : false
      } as any
    });

    // Transform response
    const transformedNumber = {
      id: updatedNumber.id,
      phoneNumber: updatedNumber.phoneNumber,
      displayName: updatedNumber.displayName,
      description: updatedNumber.description,
      country: updatedNumber.country,
      region: updatedNumber.region,
      numberType: updatedNumber.numberType,
      provider: updatedNumber.provider,
      capabilities: updatedNumber.capabilities ? JSON.parse(updatedNumber.capabilities) : [],
      isActive: updatedNumber.isActive,
      greetingAudioUrl: updatedNumber.greetingAudioUrl,
      noAnswerAudioUrl: updatedNumber.noAnswerAudioUrl,
      outOfHoursAudioUrl: updatedNumber.outOfHoursAudioUrl,
      busyAudioUrl: updatedNumber.busyAudioUrl,
      voicemailAudioUrl: updatedNumber.voicemailAudioUrl,
      businessHoursStart: updatedNumber.businessHoursStart,
      businessHoursEnd: updatedNumber.businessHoursEnd,
      businessDays: updatedNumber.businessDays,
      timezone: updatedNumber.timezone,
      assignedFlowId: updatedNumber.assignedFlowId,
      assignedFlow: updatedNumber.assignedFlow,
      createdAt: updatedNumber.createdAt,
      updatedAt: updatedNumber.updatedAt
    };

    res.json({
      success: true,
      data: transformedNumber
    });

  } catch (error) {
    console.error('Error updating inbound number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update inbound number'
    });
  }
});

export default router;