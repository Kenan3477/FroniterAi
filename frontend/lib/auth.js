const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'kennex-ai-secret-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class Auth {
  static generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static extractTokenFromRequest(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies
    const token = req.cookies?.token;
    if (token) {
      return token;
    }

    return null;
  }

  static createAuthMiddleware() {
    return async (req, res, next) => {
      try {
        const token = this.extractTokenFromRequest(req);
        
        if (!token) {
          return res.status(401).json({
            success: false,
            message: 'Access token required'
          });
        }

        const decoded = this.verifyToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    };
  }
}

module.exports = Auth;