import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const PORT = 3002;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple campaigns endpoint with database
app.get('/api/admin/campaign-management/campaigns', async (req, res) => {
  console.log('Campaigns endpoint called');
  try {
    const campaigns = await prisma.campaign.findMany({
      take: 10, // Limit to 10 records to avoid issues
    });
    
    console.log(`Found ${campaigns.length} campaigns`);
    res.json({
      success: true,
      data: campaigns,
      count: campaigns.length
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Database error' }
    });
  }
});

// Create campaign endpoint
app.post('/api/admin/campaign-management/campaigns', async (req, res) => {
  console.log('Create campaign called with:', req.body);
  try {
    const { name, description, dialMethod, dialSpeed } = req.body;
    
    const newCampaign = await prisma.campaign.create({
      data: {
        campaignId: `campaign_${Date.now()}`,
        name: name,
        description: description || '',
        dialMethod: dialMethod || 'Progressive',
        speed: dialSpeed || 2.0,
        status: 'Inactive'
      }
    });
    
    console.log('Campaign created:', newCampaign.id);
    res.json({
      success: true,
      data: newCampaign
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Database error' }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
});