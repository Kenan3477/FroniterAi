#!/usr/bin/env node

const https = require('https');

const assignCampaign = async () => {
  console.log('🔄 Assigning campaign to user...');
  
  const data = JSON.stringify({
    campaignId: 'campaign_1766751043280',
    assignedBy: 1
  });

  const options = {
    hostname: 'froniterai-production.up.railway.app',
    port: 443,
    path: '/api/user-management/1/campaigns',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzM1MjUwMDAwLCJleHAiOjE3MzUzMzY0MDB9.mock-signature'
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('📊 Response status:', res.statusCode);
      console.log('📄 Response:', responseData);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  req.write(data);
  req.end();
};

assignCampaign();