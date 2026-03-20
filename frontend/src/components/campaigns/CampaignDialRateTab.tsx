/**
 * Campaign Dial Rate Integration Tab
 * Embeds dial rate controls into campaign management
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import RealTimeDialRateManager from './RealTimeDialRateManager';

interface CampaignDialRateTabProps {
  campaignId: string;
  campaignName: string;
  isActive: boolean;
}

export const CampaignDialRateTab: React.FC<CampaignDialRateTabProps> = ({
  campaignId,
  campaignName,
  isActive
}) => {
  const [managerOpen, setManagerOpen] = useState(false);
  const [quickStats, setQuickStats] = useState({
    currentDialRate: 1.2,
    answerRate: 0.78,
    dropRate: 0.02,
    activeAgents: 12
  });

  const getPerformanceStatus = () => {
    if (quickStats.dropRate > 0.05) return { color: 'error', text: 'HIGH DROP RATE' };
    if (quickStats.answerRate < 0.6) return { color: 'warning', text: 'LOW ANSWER RATE' };
    if (quickStats.answerRate > 0.8) return { color: 'success', text: 'OPTIMAL PERFORMANCE' };
    return { color: 'info', text: 'NORMAL PERFORMANCE' };
  };

  const status = getPerformanceStatus();

  if (!isActive) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Dial rate controls are only available for active campaigns.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        📞 Dial Rate & Routing Control
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Real-time dial rate optimization and routing configuration for {campaignName}
      </Typography>

      <Grid container spacing={3}>
        {/* Quick Performance Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={2}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {quickStats.currentDialRate.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Dial Rate
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} md={2}>
                  <Box textAlign="center">
                    <Typography variant="h4" color={quickStats.answerRate > 0.7 ? 'success.main' : 'warning.main'}>
                      {Math.round(quickStats.answerRate * 100)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Answer Rate
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} md={2}>
                  <Box textAlign="center">
                    <Typography variant="h4" color={quickStats.dropRate < 0.03 ? 'success.main' : 'error.main'}>
                      {(quickStats.dropRate * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Drop Rate
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} md={2}>
                  <Box textAlign="center">
                    <Typography variant="h4">
                      {quickStats.activeAgents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Agents
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} md={2}>
                  <Box textAlign="center">
                    <Chip
                      label={status.text}
                      color={status.color}
                      size="small"
                      icon={status.color === 'error' ? <WarningIcon /> : <TrendingUpIcon />}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<SettingsIcon />}
                    onClick={() => setManagerOpen(true)}
                  >
                    Manage Dial Rate
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Adjustments
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      // Quick increase dial rate by 10%
                      setQuickStats(prev => ({
                        ...prev,
                        currentDialRate: Math.min(5.0, prev.currentDialRate * 1.1)
                      }));
                    }}
                  >
                    Increase Rate +10%
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      // Quick decrease dial rate by 10%
                      setQuickStats(prev => ({
                        ...prev,
                        currentDialRate: Math.max(0.1, prev.currentDialRate * 0.9)
                      }));
                    }}
                  >
                    Decrease Rate -10%
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    color="warning"
                    fullWidth
                    onClick={() => {
                      // Reset to optimal rate
                      setQuickStats(prev => ({
                        ...prev,
                        currentDialRate: 1.5
                      }));
                    }}
                  >
                    Reset to Optimal (1.5)
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Targets */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Targets
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Answer Rate Target: 80%
                </Typography>
                <Typography variant="body2" color={quickStats.answerRate >= 0.8 ? 'success.main' : 'warning.main'}>
                  Current: {Math.round(quickStats.answerRate * 100)}% 
                  {quickStats.answerRate >= 0.8 ? ' ✅' : ' ⚠️'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Drop Rate Limit: 3%
                </Typography>
                <Typography variant="body2" color={quickStats.dropRate <= 0.03 ? 'success.main' : 'error.main'}>
                  Current: {(quickStats.dropRate * 100).toFixed(1)}% 
                  {quickStats.dropRate <= 0.03 ? ' ✅' : ' ❌'}
                </Typography>
              </Box>

              <Alert 
                severity={status.color === 'success' ? 'success' : status.color === 'warning' ? 'warning' : 'error'}
                sx={{ mt: 2 }}
              >
                {status.text}: 
                {status.color === 'error' && ' Consider reducing dial rate'}
                {status.color === 'warning' && ' Monitor closely or adjust settings'}
                {status.color === 'success' && ' Performance is optimal'}
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Real-Time Features */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Real-Time Features
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                      Auto-Adjustment
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      AI adjusts dial rate based on performance
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <TrendingUpIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                      Live Monitoring
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Real-time performance tracking
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <WarningIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                      Smart Alerts
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Proactive performance warnings
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <SettingsIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                      Custom Routing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Intelligent call routing
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Full Dial Rate Manager Dialog */}
      <Dialog 
        open={managerOpen} 
        onClose={() => setManagerOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Dial Rate Manager - {campaignName}
            </Typography>
            <IconButton onClick={() => setManagerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <RealTimeDialRateManager 
            campaignId={campaignId}
            onClose={() => setManagerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CampaignDialRateTab;