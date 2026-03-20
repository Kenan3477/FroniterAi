#!/usr/bin/env node

/**
 * Simplified Backend Test Server
 * A minimal working server to test dial speed and AI functionality
 */

const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Starting Simplified Backend Test Server...\n');

// ===== DIAL SPEED MANAGEMENT ENDPOINTS =====

// Get current dial rate configuration
app.get('/api/campaigns/:campaignId/dial-rate/config', (req, res) => {
  const { campaignId } = req.params;
  console.log(`📊 Getting dial rate config for campaign: ${campaignId}`);
  
  res.json({
    success: true,
    data: {
      campaignId,
      dialRate: 25.5,
      predictiveRatio: 1.2,
      autoAdjustRate: true,
      maxConcurrentCalls: 50,
      abandonRateThreshold: 3.0,
      lastUpdated: new Date().toISOString()
    }
  });
});

// Update dial rate configuration
app.put('/api/campaigns/:campaignId/dial-rate/config', (req, res) => {
  const { campaignId } = req.params;
  const { dialRate, predictiveRatio, autoAdjustRate } = req.body;
  
  console.log(`🔧 Updating dial rate for campaign: ${campaignId}`);
  console.log(`   New dial rate: ${dialRate} calls/minute`);
  console.log(`   Predictive ratio: ${predictiveRatio}`);
  console.log(`   Auto-adjust: ${autoAdjustRate}`);
  
  // Simulate validation
  if (dialRate < 1 || dialRate > 100) {
    return res.status(400).json({
      success: false,
      error: 'Dial rate must be between 1 and 100 calls per minute'
    });
  }
  
  res.json({
    success: true,
    message: 'Dial rate configuration updated successfully',
    data: {
      campaignId,
      dialRate: parseFloat(dialRate),
      predictiveRatio: parseFloat(predictiveRatio),
      autoAdjustRate: !!autoAdjustRate,
      effectiveFromTimestamp: new Date().toISOString(),
      estimatedImpact: {
        expectedAnswerRateImprovement: '15-25%',
        projectedDropRateReduction: '40-60%'
      }
    }
  });
});

// Get auto-dialler status
app.get('/api/campaigns/:campaignId/auto-dialler/status', (req, res) => {
  const { campaignId } = req.params;
  console.log(`📈 Getting auto-dialler status for campaign: ${campaignId}`);
  
  res.json({
    success: true,
    data: {
      campaignId,
      active: true,
      currentRate: 28.3,
      targetRate: 30.0,
      agentsActive: 12,
      callsInProgress: 15,
      queueDepth: 247,
      efficiency: 94.2,
      answerRate: 31.5,
      dropRate: 2.8,
      lastAdjustment: new Date(Date.now() - 30000).toISOString()
    }
  });
});

// ===== SENTIMENT ANALYSIS ENDPOINTS =====

// Analyze text sentiment
app.post('/api/sentiment/analyze-text', (req, res) => {
  const { text, callId, agentId } = req.body;
  console.log(`😊 Analyzing sentiment for call: ${callId}, agent: ${agentId}`);
  console.log(`   Text: "${text}"`);
  
  // Simple sentiment analysis simulation
  const positiveWords = ['love', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'happy', 'helpful'];
  const negativeWords = ['hate', 'terrible', 'awful', 'horrible', 'frustrated', 'angry', 'disappointed'];
  
  const textLower = text.toLowerCase();
  const positiveScore = positiveWords.filter(word => textLower.includes(word)).length;
  const negativeScore = negativeWords.filter(word => textLower.includes(word)).length;
  
  let sentiment, confidence;
  if (positiveScore > negativeScore) {
    sentiment = 'positive';
    confidence = Math.min(0.7 + (positiveScore * 0.1), 0.95);
  } else if (negativeScore > positiveScore) {
    sentiment = 'negative'; 
    confidence = Math.min(0.7 + (negativeScore * 0.1), 0.95);
  } else {
    sentiment = 'neutral';
    confidence = 0.6 + Math.random() * 0.2;
  }
  
  res.json({
    success: true,
    data: {
      callId,
      agentId,
      sentiment,
      confidence: parseFloat(confidence.toFixed(3)),
      emotionalIntensity: Math.random() * 0.8 + 0.2,
      keywordsDetected: positiveScore + negativeScore,
      processingTime: Math.floor(Math.random() * 50) + 50,
      recommendations: sentiment === 'negative' ? 
        ['Use empathy statements', 'Lower speaking pace', 'Offer solutions'] :
        ['Maintain current approach', 'Ask for referrals', 'Close the conversation']
    }
  });
});

// Get real-time sentiment for a call
app.get('/api/sentiment/real-time/:callId', (req, res) => {
  const { callId } = req.params;
  console.log(`⚡ Getting real-time sentiment for call: ${callId}`);
  
  res.json({
    success: true,
    data: {
      callId,
      currentSentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
      confidence: Math.random() * 0.4 + 0.6,
      trendDirection: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)],
      emotionalState: ['calm', 'excited', 'frustrated', 'interested'][Math.floor(Math.random() * 4)],
      lastUpdated: new Date().toISOString(),
      callDuration: Math.floor(Math.random() * 300) + 30
    }
  });
});

// ===== AUTO-DISPOSITION ENDPOINTS =====

// Get disposition recommendation
app.post('/api/auto-disposition/recommend/:callId', (req, res) => {
  const { callId } = req.params;
  const { callDuration, customerResponse, agentNotes } = req.body;
  console.log(`🤖 Generating disposition recommendation for call: ${callId}`);
  console.log(`   Duration: ${callDuration}s, Response: ${customerResponse}`);
  
  // Simulate AI recommendation logic
  let recommendedDisposition, confidence, reasoning;
  
  if (customerResponse === 'interested' && callDuration > 60) {
    recommendedDisposition = 'Follow-up Required';
    confidence = 0.89;
    reasoning = 'Customer showed interest with sufficient engagement time';
  } else if (customerResponse === 'not_interested' || callDuration < 30) {
    recommendedDisposition = 'Not Interested';
    confidence = 0.92;
    reasoning = 'Clear disinterest signal or very short call duration';
  } else {
    recommendedDisposition = 'Callback Scheduled';
    confidence = 0.76;
    reasoning = 'Mixed signals suggest callback opportunity';
  }
  
  res.json({
    success: true,
    data: {
      callId,
      recommendedDisposition,
      confidence: parseFloat(confidence.toFixed(3)),
      reasoning,
      alternativeOptions: [
        { disposition: 'Voicemail', confidence: 0.34 },
        { disposition: 'Wrong Number', confidence: 0.12 }
      ],
      suggestedActions: [
        'Add contact to follow-up campaign',
        'Update lead score based on interaction',
        'Schedule callback reminder'
      ],
      processingTime: Math.floor(Math.random() * 100) + 80
    }
  });
});

// ===== LEAD SCORING ENDPOINTS =====

// Calculate lead score
app.post('/api/lead-scoring/calculate/:contactId', (req, res) => {
  const { contactId } = req.params;
  const { updateFactors, includeOptimalTiming } = req.body;
  console.log(`🎯 Calculating lead score for contact: ${contactId}`);
  
  // Simulate lead scoring calculation
  const baseScore = Math.random() * 50 + 30; // 30-80 base score
  const behaviorBonus = Math.random() * 15;
  const timingBonus = Math.random() * 10;
  const finalScore = Math.min(baseScore + behaviorBonus + timingBonus, 100);
  
  const factors = [
    { name: 'Previous Interactions', weight: 0.25, value: Math.random() * 10 },
    { name: 'Contact Information Quality', weight: 0.20, value: Math.random() * 10 },
    { name: 'Industry Match', weight: 0.15, value: Math.random() * 10 },
    { name: 'Geographic Location', weight: 0.10, value: Math.random() * 10 },
    { name: 'Time Since Last Contact', weight: 0.30, value: Math.random() * 10 }
  ];
  
  let optimalTiming = null;
  if (includeOptimalTiming) {
    const hours = [9, 10, 11, 14, 15, 16];
    const days = ['Tuesday', 'Wednesday', 'Thursday'];
    optimalTiming = {
      bestHour: hours[Math.floor(Math.random() * hours.length)],
      bestDay: days[Math.floor(Math.random() * days.length)],
      confidence: Math.random() * 0.3 + 0.6
    };
  }
  
  res.json({
    success: true,
    data: {
      contactId,
      score: parseFloat(finalScore.toFixed(1)),
      scoreCategory: finalScore >= 80 ? 'Hot' : finalScore >= 60 ? 'Warm' : 'Cold',
      priority: finalScore >= 80 ? 1 : finalScore >= 60 ? 2 : 3,
      factors: factors.map(f => ({
        ...f,
        value: parseFloat(f.value.toFixed(1)),
        contribution: parseFloat((f.weight * f.value).toFixed(2))
      })),
      optimalTiming,
      confidenceLevel: Math.random() * 0.2 + 0.8,
      lastUpdated: new Date().toISOString(),
      nextScoreUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  });
});

// ===== HEALTH CHECK ENDPOINT =====

app.get('/api/health', (req, res) => {
  console.log('💓 Health check requested');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-test',
    services: {
      dialRateManagement: 'operational',
      sentimentAnalysis: 'operational', 
      autoDisposition: 'operational',
      leadScoring: 'operational'
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Backend Test Server running on http://localhost:${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/campaigns/:id/dial-rate/config`);
  console.log(`   PUT  /api/campaigns/:id/dial-rate/config`);
  console.log(`   GET  /api/campaigns/:id/auto-dialler/status`);
  console.log(`   POST /api/sentiment/analyze-text`);
  console.log(`   GET  /api/sentiment/real-time/:callId`);
  console.log(`   POST /api/auto-disposition/recommend/:callId`);
  console.log(`   POST /api/lead-scoring/calculate/:contactId`);
  console.log(`\n🎯 Ready to test AI functionality!\n`);
});