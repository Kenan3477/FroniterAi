import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple campaigns endpoint
app.get('/api/admin/campaign-management/campaigns', (req, res) => {
  console.log('Campaigns endpoint called');
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});