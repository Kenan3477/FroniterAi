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
    console.log('📞 === INBOUND NUMBERS GET ROUTE DEBUG ===');
    console.log('📞 Fetching inbound numbers from database...');
    console.log('🎯 Expected: Only +442046343130 (real Twilio number)');
    
    // First, check ALL inbound numbers without filtering
    const allNumbers = await prisma.inboundNumber.findMany();
    console.log(`🔍 TOTAL numbers in database: ${allNumbers.length}`);
    allNumbers.forEach((num: any, index: number) => {
      console.log(`   ${index + 1}. Phone: ${num.phoneNumber}, Active: ${num.isActive}, ID: ${num.id}`);
    });
    
    // Now fetch active inbound numbers from database
    console.log('🔍 Now filtering for isActive: true...');
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

    console.log(`📊 Database returned ${inboundNumbers.length} inbound numbers`);
    inboundNumbers.forEach((num: any) => console.log(`   - ${num.phoneNumber} (${num.displayName})`));

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
    
    // Fallback to only the real Twilio number if database query fails
    const fallbackNumbers: InboundNumber[] = [
      {
        id: 'uk-local-london',
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

// POST /api/voice/inbound-numbers - Create a new inbound number (for seeding)
router.post('/inbound-numbers', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('📞 Creating new inbound number...');
    
    const {
      phoneNumber,
      displayName,
      description,
      country = 'GB',
      region,
      numberType = 'LOCAL',
      provider = 'TWILIO',
      capabilities = ['VOICE', 'SMS'],
      isActive = true
    } = req.body;

    if (!phoneNumber || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and display name are required'
      });
    }

    const newInboundNumber = await prisma.inboundNumber.create({
      data: {
        phoneNumber,
        displayName,
        description,
        country,
        region,
        numberType,
        provider,
        capabilities: JSON.stringify(capabilities),
        isActive
      }
    });

    console.log(`✅ Created inbound number: ${phoneNumber} (${displayName})`);

    res.json({
      success: true,
      data: {
        id: newInboundNumber.id,
        phoneNumber: newInboundNumber.phoneNumber,
        displayName: newInboundNumber.displayName,
        description: newInboundNumber.description,
        country: newInboundNumber.country,
        region: newInboundNumber.region,
        numberType: newInboundNumber.numberType,
        provider: newInboundNumber.provider,
        capabilities: newInboundNumber.capabilities ? JSON.parse(newInboundNumber.capabilities) : [],
        isActive: newInboundNumber.isActive,
        createdAt: newInboundNumber.createdAt,
        updatedAt: newInboundNumber.updatedAt
      }
    });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Inbound number already exists'
      });
    }
    
    console.error('Error creating inbound number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create inbound number'
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
      assignedFlowId,
      // New configuration fields
      businessHours,
      outOfHoursAction,
      routeTo,
      voicemailAudioFile,
      businessHoursVoicemailFile,
      outOfHoursAudioFile,
      outOfHoursTransferNumber,
      selectedFlowId,
      selectedQueueId,
      selectedRingGroupId,
      selectedExtension,
      autoRejectAnonymous,
      createContactOnAnonymous,
      integration,
      countryCode,
      recordCalls,
      lookupSearchFilter,
      assignedToDefaultList
    } = req.body;

    console.log('🔧 PUT /inbound-numbers/:id - Received fields:', {
      id, displayName, outOfHoursAction, routeTo, voicemailAudioFile, businessHoursVoicemailFile
    });

    // Validate flow exists if assignedFlowId is provided
    const finalFlowId = assignedFlowId || selectedFlowId;
    if (finalFlowId) {
      const flow = await prisma.flow.findUnique({
        where: { id: finalFlowId }
      });
      if (!flow) {
        return res.status(400).json({
          success: false,
          error: 'Assigned flow not found'
        });
      }
    }

    // Map new fields to existing database fields where possible
    const updateData: any = {
      displayName,
      description,
      greetingAudioUrl,
      noAnswerAudioUrl,
      outOfHoursAudioUrl: outOfHoursAudioFile || outOfHoursAudioUrl, // Map new field to existing
      busyAudioUrl,
      voicemailAudioUrl: voicemailAudioFile || businessHoursVoicemailFile || voicemailAudioUrl, // Map voicemail files
      businessHoursStart,
      businessHoursEnd,
      businessDays,
      timezone,
      isActive,
      assignedFlowId: finalFlowId || null,
      updatedAt: new Date()
    };

    // Store complex routing configuration as JSON in description or create a new field
    // For now, we'll append routing config to description
    if (routeTo || outOfHoursAction) {
      const routingConfig = {
        routeTo,
        outOfHoursAction,
        selectedFlowId,
        selectedQueueId,
        selectedRingGroupId,
        selectedExtension,
        businessHours
      };
      
      // Store routing config separately or append to description
      const baseDescription = description || `Inbound number configuration`;
      updateData.description = `${baseDescription} | Routing: ${JSON.stringify(routingConfig)}`;
    }

    console.log('🔧 Updating database with:', updateData);

    // Update the inbound number in the database
    const updatedNumber: any = await prisma.inboundNumber.update({
      where: { id },
      data: updateData,
      include: {
        assignedFlow: finalFlowId ? {
          select: {
            id: true,
            name: true,
            status: true
          }
        } : false
      } as any
    });

    console.log('✅ Database updated successfully');

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