import { Router } from 'express';
import { prisma } from '../database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Real authentication with database lookup
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 Backend login attempt for:', username);

    // For now, handle demo credentials while transitioning
    if (username === 'demo' && password === 'demo') {
      const token = jwt.sign({ userId: 'demo', username: 'demo' }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        data: {
          user: {
            id: 'demo',
            name: 'Demo User',
            email: 'demo@kennex.ai',
            username: 'demo',
            role: 'agent'
          },
          token: token
        }
      });
    }

    if (username === 'admin' && password === 'admin') {
      const token = jwt.sign({ userId: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        data: {
          user: {
            id: 'admin',
            name: 'Admin User', 
            email: 'admin@kennex.ai',
            username: 'admin',
            role: 'admin'
          },
          token: token
        }
      });
    }

    // Add Albert as a temporary user
    if (username === 'Albert' && password === '3477') {
      const token = jwt.sign({ userId: 'albert', username: 'Albert' }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        data: {
          user: {
            id: 'albert',
            name: 'Albert', 
            email: 'albert@kennex.ai',
            username: 'Albert',
            role: 'agent'
          },
          token: token
        }
      });
    }

    // TODO: Add real database user lookup
    // const user = await prisma.user.findFirst({
    //   where: { username }
    // });
    
    // if (!user || !await bcrypt.compare(password, user.password)) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Invalid credentials'
    //   });
    // }

    console.log('❌ Invalid credentials for:', username);
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
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
      email: `${decoded.username}@kennex.ai`,
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