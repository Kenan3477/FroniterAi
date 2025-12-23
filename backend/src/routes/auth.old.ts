import { Router } from 'express';
import { prisma } from '../database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'omnivox-ai-fallback-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'omnivox-ai-refresh-secret-key-change-in-production';

// Production authentication with database lookup and security features
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const loginIdentifier = email || username;

    console.log('🔐 Production login attempt for:', loginIdentifier);

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required'
      });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier.toLowerCase() },
          { username: loginIdentifier }
        ]
      }
    });

    if (!user) {
      // Log failed attempt without revealing if user exists
      console.log(`❌ Login failed: User not found for identifier: ${loginIdentifier}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
      console.log(`🔒 Login blocked: Account locked until ${user.accountLockedUntil} for user: ${user.username}`);
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to multiple failed attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      console.log(`❌ Login blocked: Inactive account for user: ${user.username}`);
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: user.failedLoginAttempts + 1,
          lastLoginAttempt: new Date(),
          // Lock account after 5 failed attempts for 30 minutes
          accountLockedUntil: user.failedLoginAttempts >= 4 ? 
            new Date(Date.now() + 30 * 60 * 1000) : undefined
        }
      });

      console.log(`❌ Login failed: Invalid password for user: ${user.username}. Failed attempts: ${updatedUser.failedLoginAttempts}`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: Math.max(0, 5 - updatedUser.failedLoginAttempts)
      });
    }

    // Successful login - reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLogin: new Date(),
        lastLoginAttempt: new Date(),
        accountLockedUntil: null
      }
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        email: user.email
      }, 
      JWT_SECRET, 
      { expiresIn: '15m' } // Short-lived access token
    );

    const refreshToken = jwt.sign(
      { 
        userId: user.id, 
        tokenVersion: user.refreshTokenVersion 
      }, 
      JWT_REFRESH_SECRET, 
      { expiresIn: '7d' } // Longer-lived refresh token
    );

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: req.headers['user-agent'] || 'Unknown',
        ipAddress: req.ip || 'Unknown'
      }
    });

    console.log(`✅ Successful login for user: ${user.username} (${user.email})`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLogin: user.lastLogin,
          preferences: user.preferences ? JSON.parse(user.preferences) : null
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service temporarily unavailable'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in database and is not expired
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
        revoked: false
      },
      include: { user: true }
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found or expired'
      });
    }

    // Check if token version matches (for token invalidation)
    if (storedToken.user.refreshTokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked'
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: storedToken.user.id,
        username: storedToken.user.username,
        role: storedToken.user.role,
        email: storedToken.user.email
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Update last used timestamp
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { lastUsed: new Date() }
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 15 * 60
      }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh service temporarily unavailable'
    });
  }
});
            id: 'demo',
            name: 'Demo User',
            email: 'demo@omnivox-ai.com',
            username: 'demo',
            role: 'agent'
          },
          token: token
        }
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