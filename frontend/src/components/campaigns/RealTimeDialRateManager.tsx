/**
 * Real-Time Dial Rate Manager Component
 * Campaign dial rate and routing configuration with live monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Slider,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
  Emergency as EmergencyIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Phone as PhoneIcon,
  Timer as TimerIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';

interface DialRateConfig {
  campaignId: string;
  dialRate: number;
  predictiveRatio: number;
  minWaitTime: number;
  maxWaitTime: number;
  answerRateTarget: number;
  dropRateLimit: number;
  routingStrategy: 'ROUND_ROBIN' | 'SKILL_BASED' | 'LEAST_BUSY' | 'PRIORITY';
  priorityRouting: boolean;
  agentIdleTimeout: number;
  callbackDelay: number;
  retryStrategy: 'LINEAR' | 'EXPONENTIAL' | 'FIBONACCI';
}

interface DialRateMetrics {
  campaignId: string;
  currentAnswerRate: number;
  currentDropRate: number;
  avgWaitTime: number;
  activeAgents: number;
  callsInProgress: number;
  callsCompleted: number;
  efficiency: number;
  lastUpdated: string;
}

interface DialRateAdjustment {
  campaignId: string;
  adjustmentType: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
  reason: string;
  oldRate: number;
  newRate: number;
  confidence: number;
  appliedAt: string;
}

interface RealTimeDialRateManagerProps {
  campaignId: string;
  onClose?: () => void;
}

export const RealTimeDialRateManager: React.FC<RealTimeDialRateManagerProps> = ({
  campaignId,
  onClose
}) => {
  const [config, setConfig] = useState<DialRateConfig | null>(null);
  const [metrics, setMetrics] = useState<DialRateMetrics | null>(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState<DialRateAdjustment[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [emergencyRate, setEmergencyRate] = useState<string>('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001');
    setSocket(newSocket);

    // Join campaign room for real-time updates
    newSocket.emit('join:campaign', campaignId);

    // Socket event listeners
    newSocket.on('dialRate:configUpdated', (data: any) => {
      if (data.campaignId === campaignId) {
        fetchConfig();
      }
    });

    newSocket.on('dialRate:metricsUpdated', (data: DialRateMetrics) => {
      if (data.campaignId === campaignId) {
        setMetrics(data);
      }
    });

    newSocket.on('dialRate:autoAdjusted', (adjustment: DialRateAdjustment) => {
      if (adjustment.campaignId === campaignId) {
        setAdjustmentHistory(prev => [adjustment, ...prev]);
        fetchConfig(); // Refresh config to get new rate
      }
    });

    newSocket.on('dialRate:emergencyAdjustment', (adjustment: DialRateAdjustment) => {
      if (adjustment.campaignId === campaignId) {
        setAdjustmentHistory(prev => [adjustment, ...prev]);
        fetchConfig();
      }
    });

    // Fetch initial data
    fetchConfig();
    fetchMetrics();
    fetchHistory();

    return () => {
      newSocket.disconnect();
    };
  }, [campaignId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dial-rate/config`);
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch dial rate configuration');
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dial-rate/metrics`);
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dial-rate/history`);
      const data = await response.json();
      
      if (data.success) {
        setAdjustmentHistory(data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dial-rate/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setError(null);
        // Config will be updated via socket event
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to save configuration');
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  const startMonitoring = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dial-rate/start-monitoring`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setIsMonitoring(true);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to start monitoring');
      console.error('Error starting monitoring:', err);
    }
  };

  const stopMonitoring = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dial-rate/stop-monitoring`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setIsMonitoring(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to stop monitoring');
      console.error('Error stopping monitoring:', err);
    }
  };

  const emergencyAdjust = async () => {
    if (!emergencyRate || !emergencyReason) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dial-rate/emergency-adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dialRate: parseFloat(emergencyRate),
          reason: emergencyReason
        })
      });

      const data = await response.json();
      if (data.success) {
        setEmergencyDialogOpen(false);
        setEmergencyRate('');
        setEmergencyReason('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to apply emergency adjustment');
      console.error('Error in emergency adjustment:', err);
    }
  };

  const getStatusColor = (value: number, target: number, isRate: boolean = false) => {
    if (isRate) {
      // For rates (answer/drop rate)
      if (value >= target * 0.9) return 'success';
      if (value >= target * 0.7) return 'warning';
      return 'error';
    } else {
      // For limits (drop rate limit)
      if (value <= target * 0.5) return 'success';
      if (value <= target) return 'warning';
      return 'error';
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading dial rate configuration...</Typography>
      </Box>
    );
  }

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load dial rate configuration</Alert>
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

      <Typography variant="h4" gutterBottom>
        📞 Real-Time Dial Rate Manager
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Campaign: {campaignId}
      </Typography>

      <Grid container spacing={3}>
        {/* Monitoring Control */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Real-Time Monitoring"
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={isMonitoring ? "outlined" : "contained"}
                    color={isMonitoring ? "error" : "primary"}
                    startIcon={isMonitoring ? <StopIcon /> : <StartIcon />}
                    onClick={isMonitoring ? stopMonitoring : startMonitoring}
                  >
                    {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                  </Button>
                  <IconButton onClick={() => setHistoryDialogOpen(true)}>
                    <HistoryIcon />
                  </IconButton>
                  <IconButton 
                    color="error"
                    onClick={() => setEmergencyDialogOpen(true)}
                  >
                    <EmergencyIcon />
                  </IconButton>
                </Box>
              }
            />
            <CardContent>
              <Chip
                label={isMonitoring ? "MONITORING ACTIVE" : "MONITORING INACTIVE"}
                color={isMonitoring ? "success" : "default"}
                icon={<AnalyticsIcon />}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Current Metrics */}
        {metrics && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Live Performance Metrics" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color={getStatusColor(metrics.currentAnswerRate, config.answerRateTarget, true)}>
                        {formatPercentage(metrics.currentAnswerRate)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Answer Rate (Target: {formatPercentage(config.answerRateTarget)})
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color={getStatusColor(metrics.currentDropRate, config.dropRateLimit)}>
                        {formatPercentage(metrics.currentDropRate)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Drop Rate (Limit: {formatPercentage(config.dropRateLimit)})
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4">
                        {metrics.activeAgents}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Agents
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4">
                        {metrics.efficiency.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Efficiency Score
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Dial Rate Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Dial Rate Settings" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography gutterBottom>
                    Dial Rate: {config.dialRate.toFixed(2)} calls/sec/agent
                  </Typography>
                  <Slider
                    value={config.dialRate}
                    onChange={(_, value) => setConfig({...config, dialRate: value as number})}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: '0.5' },
                      { value: 1.0, label: '1.0' },
                      { value: 2.0, label: '2.0' },
                      { value: 3.0, label: '3.0' },
                      { value: 5.0, label: '5.0' }
                    ]}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography gutterBottom>
                    Predictive Ratio: {config.predictiveRatio.toFixed(2)}
                  </Typography>
                  <Slider
                    value={config.predictiveRatio}
                    onChange={(_, value) => setConfig({...config, predictiveRatio: value as number})}
                    min={1.0}
                    max={3.0}
                    step={0.1}
                    marks={[
                      { value: 1.0, label: '1.0' },
                      { value: 1.5, label: '1.5' },
                      { value: 2.0, label: '2.0' },
                      { value: 2.5, label: '2.5' },
                      { value: 3.0, label: '3.0' }
                    ]}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="Answer Rate Target (%)"
                    type="number"
                    value={Math.round(config.answerRateTarget * 100)}
                    onChange={(e) => setConfig({...config, answerRateTarget: parseInt(e.target.value) / 100})}
                    inputProps={{ min: 10, max: 100 }}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="Drop Rate Limit (%)"
                    type="number"
                    value={Math.round(config.dropRateLimit * 100)}
                    onChange={(e) => setConfig({...config, dropRateLimit: parseInt(e.target.value) / 100})}
                    inputProps={{ min: 0, max: 20 }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Routing Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Routing Settings" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Routing Strategy</InputLabel>
                    <Select
                      value={config.routingStrategy}
                      onChange={(e) => setConfig({...config, routingStrategy: e.target.value as any})}
                    >
                      <MenuItem value="ROUND_ROBIN">Round Robin</MenuItem>
                      <MenuItem value="SKILL_BASED">Skill Based</MenuItem>
                      <MenuItem value="LEAST_BUSY">Least Busy</MenuItem>
                      <MenuItem value="PRIORITY">Priority</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Retry Strategy</InputLabel>
                    <Select
                      value={config.retryStrategy}
                      onChange={(e) => setConfig({...config, retryStrategy: e.target.value as any})}
                    >
                      <MenuItem value="LINEAR">Linear</MenuItem>
                      <MenuItem value="EXPONENTIAL">Exponential</MenuItem>
                      <MenuItem value="FIBONACCI">Fibonacci</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="Agent Idle Timeout (sec)"
                    type="number"
                    value={Math.round(config.agentIdleTimeout / 1000)}
                    onChange={(e) => setConfig({...config, agentIdleTimeout: parseInt(e.target.value) * 1000})}
                    inputProps={{ min: 10, max: 300 }}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="Callback Delay (min)"
                    type="number"
                    value={Math.round(config.callbackDelay / 60000)}
                    onChange={(e) => setConfig({...config, callbackDelay: parseInt(e.target.value) * 60000})}
                    inputProps={{ min: 1, max: 60 }}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.priorityRouting}
                        onChange={(e) => setConfig({...config, priorityRouting: e.target.checked})}
                      />
                    }
                    label="Enable Priority Routing"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={saveConfig}
              disabled={saving}
              startIcon={<SettingsIcon />}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            {onClose && (
              <Button variant="outlined" size="large" onClick={onClose}>
                Close
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Emergency Adjustment Dialog */}
      <Dialog open={emergencyDialogOpen} onClose={() => setEmergencyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🚨 Emergency Dial Rate Adjustment</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Emergency adjustments override automatic settings and monitoring.
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="New Dial Rate"
            type="number"
            fullWidth
            value={emergencyRate}
            onChange={(e) => setEmergencyRate(e.target.value)}
            inputProps={{ min: 0.1, max: 10, step: 0.1 }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Reason for Emergency Adjustment"
            multiline
            rows={3}
            fullWidth
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
            placeholder="Describe why this emergency adjustment is needed..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={emergencyAdjust}
            variant="contained"
            color="error"
            disabled={!emergencyRate || !emergencyReason}
          >
            Apply Emergency Adjustment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjustment History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>📊 Dial Rate Adjustment History</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Old Rate</TableCell>
                  <TableCell>New Rate</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adjustmentHistory.map((adjustment, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(adjustment.appliedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={adjustment.adjustmentType}
                        size="small"
                        color={
                          adjustment.adjustmentType === 'INCREASE' ? 'success' :
                          adjustment.adjustmentType === 'DECREASE' ? 'warning' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{adjustment.oldRate.toFixed(2)}</TableCell>
                    <TableCell>{adjustment.newRate.toFixed(2)}</TableCell>
                    <TableCell>{adjustment.reason}</TableCell>
                    <TableCell>
                      {Math.round(adjustment.confidence * 100)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RealTimeDialRateManager;