import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'sqlite3';
import path from 'path';

// Define user type for SQL query results
interface UserRow {
  id: number;
  username: string;
  email: string;
  password: string;
  name: string;
  role: string;
  status: string;
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create direct SQLite connection bypassing Prisma
const dbPath = '/Users/zenan/kennex/frontend/prisma/dev.db';
console.log('📄 Direct SQL Auth - Database path:', dbPath);
const db = new Database.Database(dbPath, Database.OPEN_READWRITE);

// Direct SQL authentication route
router.post('/login', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const loginIdentifier = email || username;

    console.log('🔐 DIRECT SQL Backend login attempt for:', loginIdentifier);

    // Handle demo credentials first
    if (loginIdentifier === 'demo' && password === 'demo') {
      const token = jwt.sign({ userId: 'demo', username: 'demo' }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        data: {
          user: {
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

    if (loginIdentifier === 'admin' && password === 'admin') {
      const token = jwt.sign({ userId: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        data: {
          user: {
            id: 'admin',
            name: 'Admin User', 
            email: 'admin@omnivox-ai.com',
            username: 'admin',
            role: 'admin'
          },
          token: token
        }
      });
    }

    // Add Albert as a temporary user
    if (loginIdentifier === 'Albert' && password === '3477') {
      const token = jwt.sign({ userId: 'albert', username: 'Albert' }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        data: {
          user: {
            id: 'albert',
            name: 'Albert', 
            email: 'albert@omnivox-ai.com',
            username: 'Albert',
            role: 'agent'
          },
          token: token
        }
      });
    }

    // Direct SQL database user lookup
    console.log('🔧 DIRECT SQL: Querying users table directly with SQL');
    
    const query = `
      SELECT id, username, email, password, name, role, status 
      FROM users 
      WHERE email = ? OR username = ? 
      LIMIT 1
    `;

    db.get(query, [loginIdentifier, loginIdentifier], async (err, user: UserRow | undefined) => {
      if (err) {
        console.error('❌ SQL Query error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        console.log('❌ User not found:', loginIdentifier);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      console.log('✅ User found:', user.username || user.email, 'Role:', user.role);

      // Check if user is active (accept both ACTIVE and AVAILABLE statuses)
      if (user.status !== 'ACTIVE' && user.status !== 'AVAILABLE') {
        return res.status(401).json({
          success: false,
          message: `Account is ${user.status.toLowerCase()}`
        });
      }

      // Verify password - with TEMPORARY BYPASS for testing
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password || '');
        
        // TEMPORARY BYPASS: Accept known test passwords for all users to test auth flow
        const isTestPassword = (
          (user.email === 'admin@omnivox.ai' && password === 'admin123') ||
          (user.email === 'supervisor@omnivox.ai' && password === 'super123') ||  
          (user.email === 'agent@omnivox.ai' && password === 'agent123')
        );
        
        if (!isPasswordValid && !isTestPassword) {
          console.log('❌ Invalid password for:', loginIdentifier);
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
        
        if (isTestPassword) {
          console.log('✅ TEMPORARY BYPASS: Test password accepted for:', loginIdentifier);
        } else {
          console.log('✅ Regular password verification succeeded for:', loginIdentifier);
        }

        // Generate JWT token
        const token = jwt.sign({ 
          userId: user.id, 
          username: user.username || user.name,
          email: user.email,
          role: user.role 
        }, JWT_SECRET, { expiresIn: '24h' });

        // Update last login (separate SQL update)
        const updateQuery = `UPDATE users SET lastLogin = datetime('now') WHERE id = ?`;
        db.run(updateQuery, [user.id], (updateErr) => {
          if (updateErr) {
            console.warn('⚠️ Could not update lastLogin:', updateErr);
          }
        });

        console.log('✅ User authenticated successfully:', user.name || user.username, `(${user.role})`);

        return res.json({
          success: true,
          data: {
            user: {
              id: user.id,
              name: user.name || user.username,
              email: user.email,
              username: user.username,
              role: user.role.toLowerCase()
            },
            token: token
          }
        });

      } catch (passwordError) {
        console.error('❌ Password verification error:', passwordError);
        return res.status(500).json({
          success: false,
          message: 'Authentication failed'
        });
      }
    });

  } catch (error) {
    console.error('❌ Auth route error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// Profile endpoint using direct SQL
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Query user from database using direct SQL
      const query = `
        SELECT id, username, email, name, role, status 
        FROM users 
        WHERE id = ? 
        LIMIT 1
      `;

      db.get(query, [decoded.userId], (err, user: UserRow | undefined) => {
        if (err) {
          console.error('❌ Profile SQL error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        return res.json({
          success: true,
          data: {
            id: user.id,
            name: user.name || user.username,
            email: user.email,
            username: user.username,
            role: user.role.toLowerCase()
          }
        });
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

export default router;