import { Router } from 'express';

const router = Router();

// Users report endpoint
router.get('/users', (req, res) => {
  try {
    console.log('📊 Users report request received');
    
    // Return basic users report structure
    res.json({
      success: true,
      data: {
        users: [
          {
            id: '1',
            name: 'Demo User',
            email: 'demo@kennex.ai',
            role: 'agent',
            status: 'active',
            lastLogin: new Date().toISOString(),
            callsToday: 0,
            totalCalls: 0
          },
          {
            id: '2',
            name: 'Admin User',
            email: 'admin@kennex.ai',
            role: 'admin',
            status: 'active',
            lastLogin: new Date().toISOString(),
            callsToday: 0,
            totalCalls: 0
          }
        ],
        summary: {
          totalUsers: 2,
          activeUsers: 2,
          inactiveUsers: 0,
          agents: 1,
          admins: 1
        }
      }
    });
  } catch (error) {
    console.error('Users report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users report'
    });
  }
});

export default router;