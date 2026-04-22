/**
 * Quick endpoint to update the existing Organization Administrator user
 * This is a temporary endpoint just for fixing the existing user name
 */

import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';

import { prisma } from '../lib/prisma';
const router = express.Router();
/**
 * @route   POST /api/admin/update-org-admin-name
 * @desc    Update existing Organization Administrator to use business name
 * @access  Private (Admin only)
 */
router.post('/update-org-admin-name', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    console.log('🔧 Looking for Organization Administrator user to update...');
    
    // Find the existing Organization Administrator user
    const orgAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { name: 'Organization Administrator' },
          { firstName: 'Organization' },
          { email: 'hello@theflashteam.co.uk' }
        ]
      },
      include: {
        organization: true
      } as any
    }) as any;
    
    if (orgAdmin) {
      console.log('📋 Found user to update:', {
        id: orgAdmin.id,
        name: orgAdmin.name,
        email: orgAdmin.email,
        organizationName: orgAdmin.organization?.displayName || orgAdmin.organization?.name
      });
      
      let businessName = 'HeatBase Solutions'; // Default business name
      
      if (orgAdmin.organization && orgAdmin.organization.displayName) {
        businessName = orgAdmin.organization.displayName;
      } else if (orgAdmin.organization && orgAdmin.organization.name) {
        businessName = orgAdmin.organization.name;
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: orgAdmin.id },
        data: {
          firstName: businessName,
          lastName: 'Administrator',
          name: `${businessName} Administrator`
        }
      });
      
      console.log('✅ Updated user successfully:', {
        oldName: orgAdmin.name,
        newName: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      });

      res.json({
        success: true,
        message: 'Organization Administrator name updated successfully',
        data: {
          oldName: orgAdmin.name,
          newName: updatedUser.name,
          businessName: businessName
        }
      });
    } else {
      console.log('❌ No Organization Administrator user found to update');
      res.json({
        success: false,
        message: 'No Organization Administrator user found to update'
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user name',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;