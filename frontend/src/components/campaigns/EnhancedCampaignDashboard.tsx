/**
 * Enhanced Campaign Management Dashboard
 * Comprehensive campaign control with real-time dial rate management
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Speed as SpeedIcon,
  People as AgentsIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import CampaignDialRateTab from './CampaignDialRateTab';
import { io, Socket } from 'socket.io-client';

interface Campaign {
  campaignId: string;
  name: string;
  status: string;
  dialMethod: string;
  speed: number;
  description?: string;
  activeAgents?: number;
  callsToday?: number;
  answerRate?: number;
  dropRate?: number;
}

interface AutoDiallerStatus {
  isRunning: boolean;
  activeAgents: number;
  callsInProgress: number;
  currentRate: number;
  queuePosition: number;
  totalQueued: number;
  lastDialTime?: string;
}

interface EnhancedCampaignDashboardProps {
  campaignId: string;
}

export const EnhancedCampaignDashboard: React.FC<EnhancedCampaignDashboardProps> = ({
  campaignId
}) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [diallerStatus, setDiallerStatus] = useState<AutoDiallerStatus | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001');
    setSocket(newSocket);

    // Join campaign room for real-time updates
    newSocket.emit('join:campaign', campaignId);

    // Socket event listeners
    newSocket.on('autoDialler:started', (data: any) => {
      if (data.campaignId === campaignId) {
        fetchDiallerStatus();
      }
    });

    newSocket.on('autoDialler:stopped', (data: any) => {
      if (data.campaignId === campaignId) {
        fetchDiallerStatus();
      }
    });

    newSocket.on('autoDialler:progress', (data: any) => {
      if (data.campaignId === campaignId) {
        setDiallerStatus(prev => prev ? { ...prev, ...data } : null);
      }
    });

    // Fetch initial data
    fetchCampaignData();
    fetchDiallerStatus();

    // Set up polling for updates
    const interval = setInterval(() => {
      fetchDiallerStatus();
    }, 10000);

    return () => {
      newSocket.disconnect();
      clearInterval(interval);
    };
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();
      
      if (data.success) {
        setCampaign(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch campaign data');
      console.error('Error fetching campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiallerStatus = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/auto-dialler/status`);
      const data = await response.json();
      
      if (data.success) {
        setDiallerStatus(data.data);
      }
    } catch (err) {
      console.error('Error fetching dialler status:', err);
    }
  };

  const startAutoDialler = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/auto-dialler/start`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        await fetchDiallerStatus();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to start auto-dialler');
      console.error('Error starting auto-dialler:', err);
    }
  };

  const stopAutoDialler = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/auto-dialler/stop`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        await fetchDiallerStatus();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to stop auto-dialler');
      console.error('Error stopping auto-dialler:', err);
    }
  };

  const pauseAutoDialler = async (duration?: number) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/auto-dialler/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration })
      });

      const data = await response.json();
      if (data.success) {
        await fetchDiallerStatus();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to pause auto-dialler');
      console.error('Error pausing auto-dialler:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'default';
      case 'Paused': return 'warning';
      case 'Completed': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading campaign dashboard...</Typography>
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Campaign not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Campaign Header */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CampaignIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" gutterBottom>
                    {campaign.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={campaign.status}
                      color={getStatusColor(campaign.status)}
                      size="small"
                    />
                    <Chip
                      label={campaign.dialMethod}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`Speed: ${campaign.speed}x`}
                      variant="outlined"
                      size="small"
                      icon={<SpeedIcon />}
                    />
                  </Box>
                </Box>
              </Box>
              {campaign.description && (
                <Typography variant="body2" color="text.secondary">
                  {campaign.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Auto-Dialler Control
              </Typography>
              
              {diallerStatus && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      Status:
                    </Typography>
                    <Chip
                      label={diallerStatus.isRunning ? "RUNNING" : "STOPPED"}
                      color={diallerStatus.isRunning ? "success" : "default"}
                      size="small"
                      icon={diallerStatus.isRunning ? <SuccessIcon /> : <StopIcon />}
                    />
                  </Box>
                  
                  {diallerStatus.isRunning && (
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Active Agents
                        </Typography>
                        <Typography variant="h6">
                          {diallerStatus.activeAgents}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Calls in Progress
                        </Typography>
                        <Typography variant="h6">
                          {diallerStatus.callsInProgress}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Dial Rate
                        </Typography>
                        <Typography variant="h6">
                          {diallerStatus.currentRate.toFixed(1)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Queue Position
                        </Typography>
                        <Typography variant="h6">
                          {diallerStatus.queuePosition}/{diallerStatus.totalQueued}
                        </Typography>
                      </Grid>
                    </Grid>
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {!diallerStatus?.isRunning ? (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<StartIcon />}
                    onClick={startAutoDialler}
                    disabled={campaign.status !== 'Active'}
                  >
                    Start
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<StopIcon />}
                      onClick={stopAutoDialler}
                      size="small"
                    >
                      Stop
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PauseIcon />}
                      onClick={() => pauseAutoDialler(15)}
                      size="small"
                    >
                      Pause 15m
                    </Button>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Campaign Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab
              icon={<SpeedIcon />}
              label="Dial Rate & Routing"
              iconPosition="start"
            />
            <Tab
              icon={<AgentsIcon />}
              label="Agents & Assignment"
              iconPosition="start"
            />
            <Tab
              icon={<AnalyticsIcon />}
              label="Analytics & Reports"
              iconPosition="start"
            />
            <Tab
              icon={<SettingsIcon />}
              label="Campaign Settings"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {currentTab === 0 && (
          <CampaignDialRateTab
            campaignId={campaignId}
            campaignName={campaign.name}
            isActive={campaign.status === 'Active'}
          />
        )}

        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Agent Assignment & Management
            </Typography>
            <Alert severity="info">
              Agent management features coming soon. Use the current agent assignment system in the meantime.
            </Alert>
          </Box>
        )}

        {currentTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Campaign Analytics & Reports
            </Typography>
            <Alert severity="info">
              Advanced campaign analytics are available in the main reports section.
            </Alert>
          </Box>
        )}

        {currentTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Campaign Configuration
            </Typography>
            <Alert severity="info">
              Campaign settings can be modified through the campaign management interface.
            </Alert>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default EnhancedCampaignDashboard;