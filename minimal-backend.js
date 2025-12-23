const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Basic middleware only
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Simple campaigns endpoint for testing
app.get('/api/admin/campaign-management/campaigns', (req, res) => {
  console.log('Campaigns endpoint called');
  res.json({
    success: true,
    data: [],
    count: 0,
    message: 'Minimal server test endpoint'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: { message: 'Endpoint not found' }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Campaigns: http://localhost:${PORT}/api/admin/campaign-management/campaigns`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');  
  process.exit(0);
});