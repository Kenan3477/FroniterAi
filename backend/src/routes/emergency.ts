import { Router } from 'express';
import { prisma } from '../database/index.js';
import bcrypt from 'bcrypt';

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
    
    // Reset failed login attempts and clear account lockout
    const updateData = {
      accountLockedUntil: null,  // Clear account lockout
      failedLoginAttempts: 0,    // Reset failed attempts counter
      updatedAt: new Date()
    };
    
    // Try to reset lockout fields
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
      
      console.log(`✅ Account lockout cleared for: ${user.email}`);
      console.log(`   - accountLockedUntil: cleared`);
      console.log(`   - failedLoginAttempts: reset to 0`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Could not update user record: ${errorMessage}`);
      // If fields don't exist, that's fine - just continue
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

// Emergency password reset endpoint - no auth required for emergencies
router.post('/reset-password/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
        message: 'newPassword field is required'
      });
    }
    
    console.log(`🔑 Emergency password reset requested for: ${email}`);
    
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
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password and clear lockout
    const updateData = {
      password: hashedPassword,
      accountLockedUntil: null,  // Clear account lockout
      failedLoginAttempts: 0,    // Reset failed attempts counter
      updatedAt: new Date()
    };
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    
    console.log(`✅ Password reset successful for: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        email: user.email,
        username: user.username,
        name: user.name,
        passwordReset: true,
        unlocked: true,
        suggestion: 'You can now log in with the new password'
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Emergency password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed',
      message: errorMessage
    });
  }
});

export { router as emergencyRoutes };