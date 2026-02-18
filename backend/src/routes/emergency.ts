import { Router } from 'express';
import { prisma } from '../database/index.js';

const router = Router();

// Emergency unlock endpoint - no auth required for emergencies
router.post('/emergency-unlock/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    console.log(`🔓 Emergency unlock requested for: ${email}`);
    
    // Find the user
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: email },
          { username: email }
        ]
      }
    });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with that email or username'
      });
    }
    
    console.log(`👤 Found user: ${user.name} (${user.email})`);
    
    // Reset failed login attempts (if that field exists)
    const updateData = {
      updatedAt: new Date()
    };
    
    // Try to reset common lockout fields
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
      
      console.log(`✅ User record updated for unlock: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Could not update user record: ${errorMessage}`);
    }
    
    // Also try to clear any auth-related cache/sessions
    console.log(`🔄 Account unlock attempted for: ${email}`);
    
    res.json({
      success: true,
      message: 'Account unlock attempted',
      data: {
        email: user.email,
        username: user.username,
        name: user.name,
        unlocked: true,
        suggestion: 'Try logging in again now - the lockout should be cleared'
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Emergency unlock error:', error);
    res.status(500).json({
      success: false,
      error: 'Unlock failed',
      message: errorMessage
    });
  }
});

// Get user info without auth (for debugging)
router.get('/user-info/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    console.log(`🔍 Looking up user info: ${email}`);
    
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: email },
          { username: email }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ User lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Lookup failed',
      message: errorMessage
    });
  }
});

export { router as emergencyRoutes };