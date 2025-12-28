import { Router } from 'express';
import { prisma } from '../database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'omnivox-ai-fallback-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'omnivox-ai-refresh-secret-key-change-in-production';

// TEMPORARY DEBUG ENDPOINT - Remove after fixing bcrypt issue
router.post('/debug-user-hash', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔍 Debug endpoint called for:', email);
    
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase()
      }
    });
    
    if (!user) {
      return res.json({
        success: false,
        message: 'User not found',
        email: email
      });
    }
    
    console.log('🔍 Found user:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      hasPasswordField: !!user.password,
      passwordLength: user.password?.length || 0,
      passwordPrefix: user.password?.substring(0, 10) || 'N/A'
    });
    
    // Test password comparison
    const isValid = await bcrypt.compare(password, user.password);
    
    // Test with different password variations
    const testResults = {
      original: await bcrypt.compare(password, user.password),
      trimmed: await bcrypt.compare(password.trim(), user.password),
      normalized: await bcrypt.compare(password.normalize(), user.password)
    };
    
    // Create a fresh hash of the input password for comparison
    const freshHash = await bcrypt.hash(password, 12);
    const freshVerify = await bcrypt.compare(password, freshHash);
    
    return res.json({
      success: true,
      debug: {
        userId: user.id,
        inputPassword: password,
        inputPasswordType: typeof password,
        inputPasswordLength: password.length,
        storedHashLength: user.password.length,
        storedHashPrefix: user.password.substring(0, 20),
        passwordComparison: isValid,
        testResults,
        freshHashWorks: freshVerify,
        freshHash: freshHash.substring(0, 20) + '...'
      }
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Production authentication with database lookup and security features
router.post('/login', async (req, res) => {
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
    console.log('🔍 Password verification details:');
    console.log('  - Login identifier:', JSON.stringify(loginIdentifier));
    console.log('  - Login type:', email ? 'EMAIL' : 'USERNAME');
    console.log('  - Input password:', JSON.stringify(password));
    console.log('  - Input password type:', typeof password);
    console.log('  - Input password length:', password?.length || 0);
    console.log('  - Found user ID:', user.id);
    console.log('  - Found user email:', user.email);
    console.log('  - Found user username:', user.username);
    console.log('  - Stored hash:', user.password);
    console.log('  - Hash length:', user.password?.length || 0);
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔍 Password comparison result:', isPasswordValid);
    
    // Additional debug: test with known working password
    if (!isPasswordValid && user.email === 'Kennen_02@icloud.com') {
      console.log('🔍 Testing with demo password for debug...');
      const testDemoPassword = await bcrypt.compare('OmnivoxAgent2025!', user.password);
      console.log('🔍 Demo password test result:', testDemoPassword);
      
      // Test with the exact password that works with username
      console.log('🔍 Testing password that works with username...');
      const testWorkingPassword = await bcrypt.compare('Kenzo3477!', user.password);
      console.log('🔍 Working password test result:', testWorkingPassword);
    }
    
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
        token: accessToken, // For backward compatibility
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
        isRevoked: false
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
        token: newAccessToken, // For backward compatibility
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

// Profile endpoint with proper authentication middleware
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
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        lastLogin: true,
        preferences: true,
        status: true,
        statusSince: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or inactive'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          preferences: user.preferences ? JSON.parse(user.preferences) : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile service temporarily unavailable'
    });
  }
});

// Profile update endpoint with proper authentication middleware
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const userId = decoded.userId;
    const { firstName, lastName, email, preferences } = req.body;

    // Validate input
    if (!firstName && !lastName && !email && !preferences) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (firstName, lastName, email, preferences) is required'
      });
    }

    // Build update data
    const updateData: any = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    
    // Update name if first or last name changed
    if (firstName || lastName) {
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (currentUser) {
        updateData.name = `${firstName || currentUser.firstName} ${lastName || currentUser.lastName}`;
      }
    }
    
    // Handle email change (also updates username)
    if (email) {
      updateData.email = email.toLowerCase();
      updateData.username = email.split('@')[0];
    }
    
    // Handle preferences
    if (preferences) {
      updateData.preferences = JSON.stringify(preferences);
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        preferences: true,
        status: true,
        statusSince: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`✅ Profile updated for user: ${updatedUser.name} (${updatedUser.email})`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          ...updatedUser,
          preferences: updatedUser.preferences ? JSON.parse(updatedUser.preferences) : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update service temporarily unavailable'
    });
  }
});

// Logout endpoint with token revocation
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const authHeader = req.headers.authorization;

    // Revoke refresh token if provided
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true }
      });
    }

    // In a production system with token blacklisting, you would also blacklist the access token
    // For now, we rely on short token expiry times

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout service temporarily unavailable'
    });
  }
});

// Registration endpoint for admin user creation
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role = 'AGENT' } = req.body;
    
    console.log('🔐 Registration attempt for:', username);

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: username, email, password, firstName, lastName'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        role: role.toUpperCase(),
        isActive: true
      }
    });

    console.log(`✅ User created successfully: ${newUser.username} (${newUser.email})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isActive: newUser.isActive
        }
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration service temporarily unavailable'
    });
  }
});

export default router;