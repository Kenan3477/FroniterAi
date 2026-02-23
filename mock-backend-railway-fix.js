#!/usr/bin/env node

/**
 * Temporary Mock Backend for Login/Logout Reports
 * This provides mock data while Railway backend is being fixed
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mock Backend for Railway Fix' });
});

// Mock user-sessions endpoint for login/logout reports
app.get('/api/admin/user-sessions', (req, res) => {
  console.log('📧 Mock user-sessions request:', req.query);
  
  const mockData = {
    success: true,
    data: [
      {
        id: 'session_1',
        userId: 'user_123',
        username: 'ken@simpleemails.co.uk',
        action: 'login',
        timestamp: '2026-02-20T10:30:00Z',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome',
        success: true,
        details: 'Successful login'
      },
      {
        id: 'session_2',
        userId: 'user_123',
        username: 'ken@simpleemails.co.uk',
        action: 'logout',
        timestamp: '2026-02-20T15:45:00Z',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome',
        success: true,
        details: 'Normal logout'
      },
      {
        id: 'session_3',
        userId: 'user_456',
        username: 'admin@test.co.uk',
        action: 'login',
        timestamp: '2026-02-21T09:15:00Z',
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 Firefox',
        success: true,
        details: 'Admin login'
      },
      {
        id: 'session_4',
        userId: 'user_789',
        username: 'agent@test.co.uk',
        action: 'failed_login',
        timestamp: '2026-02-22T11:20:00Z',
        ipAddress: '172.16.0.25',
        userAgent: 'Mozilla/5.0 Safari',
        success: false,
        details: 'Invalid password attempt'
      },
      {
        id: 'session_5',
        userId: 'user_456',
        username: 'admin@test.co.uk',
        action: 'logout',
        timestamp: '2026-02-22T17:30:00Z',
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 Firefox',
        success: true,
        details: 'End of day logout'
      }
    ],
    total: 5,
    message: 'Mock data for testing login/logout reports while Railway backend is being fixed'
  };
  
  console.log('📧 Returning mock data:', mockData.data.length, 'records');
  res.json(mockData);
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log('🔧 Mock backend running on port', PORT);
  console.log('🔧 This is temporary while Railway backend is being fixed');
  console.log('🔧 Endpoints:');
  console.log('   GET /health');
  console.log('   GET /api/admin/user-sessions');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔧 Shutting down mock backend');
  process.exit(0);
});