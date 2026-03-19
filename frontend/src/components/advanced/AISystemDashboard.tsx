/**
 * AI System Dashboard Component
 * Real-time monitoring and control of AI systems
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Psychology as BrainIcon,
  RecordVoiceOver as CoachingIcon,
  Analytics as PredictionIcon,
  Assignment as DispositionIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';

interface AISystemStatus {
  scoring: boolean;
  disposition: boolean;
  coaching: boolean;
  prediction: boolean;
  overall: 'ACTIVE' | 'PARTIAL' | 'INACTIVE';
}

interface CallAIContext {
  callId: string;
  agentId: string;
  campaignId: string;
  contactId: string;
  startTime: string;
  aiEnabled: boolean;
}

interface CoachingPrompt {
  type: 'WHISPER' | 'VISUAL' | 'ALERT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  action: string;
  timestamp: string;
}

interface AIAnalytics {
  activeCalls: number;
  systemStatus: AISystemStatus;
  callsToday: number;
  averageAIScore: number;
  coachingPromptsToday: number;
  dispositionAccuracy: number;
  campaignAdjustmentsToday: number;
}

export const AISystemDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<AISystemStatus>({
    scoring: false,
    disposition: false,
    coaching: false,
    prediction: false,
    overall: 'INACTIVE'
  });
  
  const [activeCalls, setActiveCalls] = useState<CallAIContext[]>([]);
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [recentPrompts, setRecentPrompts] = useState<(CoachingPrompt & { agentId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Manual coaching state
  const [coachingDialogOpen, setCoachingDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [coachingMessage, setCoachingMessage] = useState('');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001');
    setSocket(newSocket);

    // Subscribe to AI system events
    newSocket.on('ai:system:status', (status: AISystemStatus) => {
      setSystemStatus(status);
    });

    newSocket.on('coaching:prompt', (data: CoachingPrompt & { agentId: string }) => {
      setRecentPrompts(prev => [data, ...prev.slice(0, 19)]); // Keep last 20
    });

    // Fetch initial data
    fetchAIAnalytics();
    fetchActiveCalls();

    // Set up polling
    const interval = setInterval(() => {
      fetchAIAnalytics();
      fetchActiveCalls();
    }, 10000);

    return () => {
      newSocket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchAIAnalytics = async () => {
    try {
      const response = await fetch('/api/ai/analytics');
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
        setSystemStatus(data.data.systemStatus);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch AI analytics');
      console.error('Error fetching AI analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCalls = async () => {
    try {
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      
      if (data.success) {
        setActiveCalls(data.data.calls);
      }
    } catch (err) {
      console.error('Error fetching active calls:', err);
    }
  };

  const handleSystemToggle = async (system: keyof Omit<AISystemStatus, 'overall'>, enabled: boolean) => {
    try {
      const response = await fetch('/api/ai/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [`enable${system.charAt(0).toUpperCase() + system.slice(1)}`]: enabled
        })
      });

      const data = await response.json();
      if (data.success) {
        setSystemStatus(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update system configuration');
      console.error('Error updating system:', err);
    }
  };

  const sendManualCoachingPrompt = async () => {
    if (!selectedAgentId || !coachingMessage.trim()) return;

    try {
      const response = await fetch('/api/ai/coaching/manual-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgentId,
          supervisorId: 'supervisor-1', // This would be dynamic based on current user
          message: coachingMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        setCoachingDialogOpen(false);
        setCoachingMessage('');
        setSelectedAgentId('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to send coaching prompt');
      console.error('Error sending coaching prompt:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PARTIAL': return 'warning';
      case 'INACTIVE': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? <SuccessIcon color="success" /> : <ErrorIcon color="error" />;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading AI System Dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🤖 AI System Dashboard
      </Typography>

      {/* System Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  label={`Overall: ${systemStatus.overall}`}
                  color={getStatusColor(systemStatus.overall)}
                  sx={{ mr: 2 }}
                />
                {analytics && (
                  <Typography variant="body2">
                    {analytics.activeCalls} active calls
                  </Typography>
                )}
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(systemStatus.scoring)}
                  </ListItemIcon>
                  <ListItemText primary="Real-Time AI Scoring" />
                  <Switch
                    checked={systemStatus.scoring}
                    onChange={(e) => handleSystemToggle('scoring', e.target.checked)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(systemStatus.disposition)}
                  </ListItemIcon>
                  <ListItemText primary="Automated Disposition" />
                  <Switch
                    checked={systemStatus.disposition}
                    onChange={(e) => handleSystemToggle('disposition', e.target.checked)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(systemStatus.coaching)}
                  </ListItemIcon>
                  <ListItemText primary="Live Coaching" />
                  <Switch
                    checked={systemStatus.coaching}
                    onChange={(e) => handleSystemToggle('coaching', e.target.checked)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(systemStatus.prediction)}
                  </ListItemIcon>
                  <ListItemText primary="Predictive Campaign Adjustment" />
                  <Switch
                    checked={systemStatus.prediction}
                    onChange={(e) => handleSystemToggle('prediction', e.target.checked)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Analytics
              </Typography>
              {analytics && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Calls Today
                    </Typography>
                    <Typography variant="h4">
                      {analytics.callsToday}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Average AI Score
                    </Typography>
                    <Typography variant="h4">
                      {Math.round(analytics.averageAIScore)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Coaching Prompts
                    </Typography>
                    <Typography variant="h4">
                      {analytics.coachingPromptsToday}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Campaign Adjustments
                    </Typography>
                    <Typography variant="h4">
                      {analytics.campaignAdjustmentsToday}
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Calls */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active AI-Enabled Calls
              </Typography>
              {activeCalls.length === 0 ? (
                <Typography color="text.secondary">
                  No active AI-enabled calls
                </Typography>
              ) : (
                <List>
                  {activeCalls.map((call) => (
                    <ListItem key={call.callId} divider>
                      <ListItemIcon>
                        <AIIcon color={call.aiEnabled ? 'success' : 'disabled'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Call ${call.callId.slice(-8)}`}
                        secondary={`Agent: ${call.agentId} | Campaign: ${call.campaignId} | Started: ${new Date(call.startTime).toLocaleTimeString()}`}
                      />
                      {systemStatus.coaching && (
                        <IconButton
                          onClick={() => {
                            setSelectedAgentId(call.agentId);
                            setCoachingDialogOpen(true);
                          }}
                        >
                          <SendIcon />
                        </IconButton>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Coaching Prompts
              </Typography>
              {recentPrompts.length === 0 ? (
                <Typography color="text.secondary">
                  No recent coaching prompts
                </Typography>
              ) : (
                <List dense>
                  {recentPrompts.slice(0, 5).map((prompt, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <CoachingIcon color={
                          prompt.priority === 'CRITICAL' ? 'error' :
                          prompt.priority === 'HIGH' ? 'warning' : 'primary'
                        } />
                      </ListItemIcon>
                      <ListItemText
                        primary={prompt.message}
                        secondary={`Agent: ${prompt.agentId} | ${new Date(prompt.timestamp).toLocaleTimeString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manual Coaching Dialog */}
      <Dialog open={coachingDialogOpen} onClose={() => setCoachingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Manual Coaching Prompt</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Send a coaching message to Agent: {selectedAgentId}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Coaching Message"
            value={coachingMessage}
            onChange={(e) => setCoachingMessage(e.target.value)}
            placeholder="Enter coaching guidance for the agent..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoachingDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={sendManualCoachingPrompt}
            variant="contained"
            disabled={!coachingMessage.trim()}
          >
            Send Coaching Prompt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AISystemDashboard;