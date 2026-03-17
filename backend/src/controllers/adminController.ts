/**
 * Admin endpoint to fix call records data
 * This is a one-time fix for the Agent N/A, John Turner, and phone number issues
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../middleware/auth';

const prisma = new PrismaClient();

export const fixCallRecordsData = [requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    console.log('🔧 Admin triggered call records data fix...');

    // 1. Ensure all users have agent records
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    const agentMap = new Map();

    for (const user of allUsers) {
      let agent = await prisma.agent.findUnique({
        where: { email: user.email }
      });

      if (!agent) {
        const agentId = `agent-${user.id}`;
        agent = await prisma.agent.create({
          data: {
            agentId: agentId,
            firstName: user.firstName || user.username || 'Unknown',
            lastName: user.lastName || 'User',
            email: user.email,
            status: 'Available'
          }
        });
        console.log(`✅ Created agent for ${user.username}: ${agent.agentId}`);
      }

      agentMap.set(user.id, agent.agentId);
    }

    // 2. Fix call records with missing agent IDs
    const callsNeedingAgents = await prisma.callRecord.findMany({
      where: {
        OR: [
          { agentId: { equals: null } },
          { agentId: { equals: '' } }
        ]
      }
    });

    const adminUser = allUsers.find(u => u.role === 'ADMIN' || u.username.toLowerCase().includes('admin'));
    let agentUpdates = 0;

    if (adminUser && agentMap.has(adminUser.id)) {
      const adminAgentId = agentMap.get(adminUser.id);
      
      const updateResult = await prisma.callRecord.updateMany({
        where: {
          OR: [
            { agentId: { equals: null } },
            { agentId: { equals: '' } }
          ]
        },
        data: {
          agentId: adminAgentId
        }
      });

      agentUpdates = updateResult.count;
    }

    // 3. Fix John Turner contacts
    const johnTurnerUpdates = await prisma.contact.updateMany({
      where: {
        AND: [
          { firstName: 'John' },
          { lastName: 'Turner' }
        ]
      },
      data: {
        firstName: 'Unknown',
        lastName: 'Contact'
      }
    });

    // 4. Fix phone numbers
    // Update from dialedNumber field
    const phoneFixResult1 = await prisma.$executeRaw`
      UPDATE "call_records" 
      SET "phoneNumber" = "dialedNumber" 
      WHERE ("phoneNumber" IS NULL OR "phoneNumber" = '' OR "phoneNumber" = 'Unknown') 
      AND "dialedNumber" IS NOT NULL 
      AND "dialedNumber" != '' 
      AND "dialedNumber" != 'Unknown'
    `;

    // Update from contact data
    const callsNeedingPhones = await prisma.callRecord.findMany({
      where: {
        OR: [
          { phoneNumber: { equals: '' } },
          { phoneNumber: { equals: 'Unknown' } }
        ]
      },
      include: {
        contact: {
          select: {
            phone: true,
            mobile: true,
            workPhone: true,
            homePhone: true
          }
        }
      }
    });

    let phoneUpdateCount = 0;
    for (const call of callsNeedingPhones) {
      if (call.contact) {
        const phone = call.contact.phone || call.contact.mobile || call.contact.workPhone || call.contact.homePhone;
        if (phone && phone !== 'Unknown') {
          await prisma.callRecord.update({
            where: { id: call.id },
            data: {
              phoneNumber: phone,
              dialedNumber: phone
            }
          });
          phoneUpdateCount++;
        }
      }
    }

    // 5. Generate final stats
    const stats = {
      totalCalls: await prisma.callRecord.count(),
      callsWithAgents: await prisma.callRecord.count({
        where: { 
          agentId: { 
            not: { 
              in: ['', 'NULL'] 
            }
          }
        }
      }),
      callsWithPhones: await prisma.callRecord.count({
        where: { 
          phoneNumber: { 
            notIn: ['', 'Unknown', 'NULL']
          }
        }
      }),
      johnTurnerRemaining: await prisma.contact.count({
        where: {
          firstName: 'John',
          lastName: 'Turner'
        }
      })
    };

    const fixResults = {
      agentRecordsCreated: agentMap.size,
      callRecordsUpdatedWithAgents: agentUpdates,
      johnTurnerContactsFixed: johnTurnerUpdates.count,
      phoneNumbersFixedFromDialed: Number(phoneFixResult1),
      phoneNumbersFixedFromContact: phoneUpdateCount,
      finalStats: stats
    };

    console.log('✅ Call records data fix completed:', fixResults);

    res.json({
      success: true,
      message: 'Call records data fix completed successfully',
      results: fixResults
    });

  } catch (error: any) {
    console.error('❌ Error fixing call records data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fix call records data'
    });
  }
}];