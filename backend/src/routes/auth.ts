import { Router } from 'express';
import { prisma } from '../database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Real authentication with database lookup
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const loginIdentifier = email || username;

    console.log('🔐 Backend login attempt for:', loginIdentifier);

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required'
      });
    }

    // Database user lookup for authenticated users
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: loginIdentifier },
          { name: loginIdentifier }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ User not found:', loginIdentifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}`
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', loginIdentifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign({ 
      userId: user.id, 
      username: user.name,
      email: user.email,
      role: user.role 
    }, JWT_SECRET, { expiresIn: '24h' });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    console.log('✅ User authenticated successfully:', user.name, `(${user.role})`);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.name, // Use name as username for compatibility
          role: user.role.toLowerCase()
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// Profile endpoint
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Return user profile based on token
    const userProfile = {
      id: decoded.userId,
      name: decoded.userId === 'admin' ? 'Admin User' : 'Demo User',
      email: `${decoded.username}@omnivox-ai.com`,
      username: decoded.username,
      role: decoded.userId === 'admin' ? 'admin' : 'agent',
      status: 'active'
    };

    res.json({
      success: true,
      data: {
        user: userProfile
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

router.post('/logout', (req, res) => {
  // In a real implementation, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Add missing register endpoint for frontend compatibility
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    
    console.log('🔐 Backend registration attempt for:', username);
    
    // Basic implementation for frontend compatibility
    // In production, this would create a user in the database
    res.status(501).json({
      success: false,
      message: 'Registration not yet implemented'
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add missing refresh endpoint for frontend compatibility  
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Basic implementation for frontend compatibility
    // In production, this would validate and refresh the token
    res.status(501).json({
      success: false,
      message: 'Token refresh not yet implemented'
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;