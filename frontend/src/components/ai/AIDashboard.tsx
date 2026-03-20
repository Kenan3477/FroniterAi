/**
 * AI Dashboard Navigation Component
 * Main navigation hub for all Phase 3 AI-powered features
 */

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert
} from '@mui/material';
import {
  Psychology as AIIcon,
  Sentiment as SentimentIcon,
  AutoFixHigh as AutoDispIcon,
  TrendingUp as LeadScoreIcon,
  VerifiedUser as QualityIcon,
  Speed as DialRateIcon
} from '@mui/icons-material';

import SentimentDashboard from '../sentiment/SentimentDashboard';
import RealTimeDialRateManager from '../campaigns/RealTimeDialRateManager';

interface AIDashboardProps {
  organizationId?: string;
  agentId?: string;
}

export const AIDashboard: React.FC<AIDashboardProps> = ({
  organizationId,
  agentId
}) => {
  const [currentTab, setCurrentTab] = useState(0);

  const aiFeatures = [
    {
      id: 'sentiment',
      name: 'Sentiment Analysis',
      description: 'Real-time emotion and sentiment detection',
      icon: <SentimentIcon />,
      status: 'ACTIVE',
      component: <SentimentDashboard organizationId={organizationId} />
    },
    {
      id: 'dial-rate',
      name: 'Dial Rate Management', 
      description: 'Real-time dial rate optimization and control',
      icon: <DialRateIcon />,
      status: 'ACTIVE',
      component: <RealTimeDialRateManager />
    },
    {
      id: 'auto-disposition',
      name: 'Auto-Disposition',
      description: 'AI-powered disposition recommendations',
      icon: <AutoDispIcon />,
      status: 'PREVIEW',
      component: <AutoDispositionPlaceholder />
    },
    {
      id: 'lead-scoring',
      name: 'Lead Scoring',
      description: 'Intelligent lead prioritization and timing',
      icon: <LeadScoreIcon />,
      status: 'PREVIEW', 
      component: <LeadScoringPlaceholder />
    },
    {
      id: 'quality',
      name: 'Quality Monitoring',
      description: 'Automated quality and compliance monitoring',
      icon: <QualityIcon />,
      status: 'PREVIEW',
      component: <QualityMonitoringPlaceholder />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PREVIEW': return 'warning'; 
      case 'COMING_SOON': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AIIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
          AI-Powered Dialler Features
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Advanced AI capabilities for superior call center performance
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {aiFeatures.map((feature, index) => (
          <Grid item xs={12} md={6} lg={4} key={feature.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { elevation: 4 },
                border: currentTab === index ? 2 : 0,
                borderColor: 'primary.main'
              }}
              onClick={() => setCurrentTab(index)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {feature.icon}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    {feature.name}
                  </Typography>
                  <Chip 
                    label={feature.status} 
                    color={getStatusColor(feature.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* AI Feature Content */}
      <Card>
        <CardContent>
          {aiFeatures[currentTab]?.component}
        </CardContent>
      </Card>
    </Box>
  );
};

// Placeholder components for features in development
const AutoDispositionPlaceholder = () => (
  <Alert severity="info">
    Auto-Disposition interface is being finalized. Backend AI engine is fully operational.
    Contact support for access to disposition recommendation APIs.
  </Alert>
);

const LeadScoringPlaceholder = () => (
  <Alert severity="info">
    Lead Scoring dashboard is in development. AI scoring algorithms are operational.
    Lead scores are being calculated and available via API endpoints.
  </Alert>
);

const QualityMonitoringPlaceholder = () => (
  <Alert severity="info">
    Quality Monitoring interface is being completed. Quality assessment engine is running.
    Quality scores and compliance monitoring are active in the background.
  </Alert>
);

export default AIDashboard;