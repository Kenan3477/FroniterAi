/**
 * AI Dashboard Navigation Component
 * Main navigation hub for all Phase 3 AI-powered features
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain as AIIcon,
  Heart as SentimentIcon,
  Zap as AutoDispIcon,
  TrendingUp as LeadScoreIcon,
  Shield as QualityIcon,
  Gauge as DialRateIcon,
  AlertTriangle
} from 'lucide-react';

import { SentimentDashboard } from '../sentiment/SentimentDashboard';
import { RealTimeDialRateManager } from '../campaigns/RealTimeDialRateManager';

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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'PREVIEW': return 'secondary'; 
      case 'COMING_SOON': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <AIIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Dialler Features</h1>
          <p className="text-muted-foreground">Advanced AI capabilities for superior call center performance</p>
        </div>
      </div>

      {/* AI Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {aiFeatures.map((feature, index) => (
          <Card 
            key={feature.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              currentTab === index ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setCurrentTab(index)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {feature.icon}
                  <CardTitle className="text-lg">{feature.name}</CardTitle>
                </div>
                <Badge variant={getStatusVariant(feature.status)}>
                  {feature.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Feature Content */}
      <Card>
        <CardContent className="p-6">
          {aiFeatures[currentTab]?.component}
        </CardContent>
      </Card>
    </div>
  );
};

// Placeholder components for features in development
const AutoDispositionPlaceholder = () => (
  <Alert>
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Auto-Disposition interface is being finalized. Backend AI engine is fully operational.
      Contact support for access to disposition recommendation APIs.
    </AlertDescription>
  </Alert>
);

const LeadScoringPlaceholder = () => (
  <Alert>
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Lead Scoring dashboard is in development. AI scoring algorithms are operational.
      Lead scores are being calculated and available via API endpoints.
    </AlertDescription>
  </Alert>
);

const QualityMonitoringPlaceholder = () => (
  <Alert>
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Quality Monitoring interface is being completed. Quality assessment engine is running.
      Quality scores and compliance monitoring are active in the background.
    </AlertDescription>
  </Alert>
);

export default AIDashboard;