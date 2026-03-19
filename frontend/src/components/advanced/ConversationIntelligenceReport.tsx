/**
 * Conversation Intelligence Report Component
 * AI-powered conversation analysis and coaching insights
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  TrendingDown,
  Mic,
  VolumeUp,
  Timer,
  EmojiEmotions,
  Warning,
  CheckCircle,
  Lightbulb,
  PlayArrow,
  Pause,
  Refresh
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';

interface ConversationIntelligenceProps {
  agentId?: string;
  callId?: string;
  dateRange?: string;
}

const ConversationIntelligenceReport: React.FC<ConversationIntelligenceProps> = ({
  agentId,
  callId,
  dateRange = '7'
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(agentId || 'all');

  useEffect(() => {
    loadConversationData();
  }, [agentId, callId, dateRange, selectedAgent]);

  const loadConversationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (callId) params.append('callId', callId);
      if (selectedAgent !== 'all') params.append('agentId', selectedAgent);
      if (dateRange !== 'all') {
        const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        params.append('dateRange', startDate);
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://froniterai-production.up.railway.app'}/api/advanced-reports/conversation-intelligence?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Failed to load conversation intelligence:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'success.main';
    if (score < -0.3) return 'error.main';
    return 'warning.main';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  const getConversationFlowData = () => {
    if (!data?.analyses) return null;

    const last10Calls = data.analyses.slice(0, 10);
    return {
      labels: last10Calls.map((_: any, index: number) => `Call ${index + 1}`),
      datasets: [
        {
          label: 'Talk Time (minutes)',
          data: last10Calls.map((a: any) => Math.round(a.talkTime / 60)),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Listen Time (minutes)',
          data: last10Calls.map((a: any) => Math.round(a.listenTime / 60)),
          backgroundColor: 'rgba(255, 206, 86, 0.6)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const getLeadScoringTrend = () => {
    if (!data?.analyses) return null;

    const scoredCalls = data.analyses.filter((a: any) => a.leadScore).slice(0, 20);
    return {
      labels: scoredCalls.map((_: any, index: number) => `Call ${index + 1}`),
      datasets: [{
        label: 'Lead Score',
        data: scoredCalls.map((a: any) => a.leadScore),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    };
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h5" gutterBottom>
          <Psychology sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Conversation Intelligence Report
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Analyzing conversation data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error}
          <Button onClick={loadConversationData} size="small" sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          <Psychology sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Conversation Intelligence Report
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Agent</InputLabel>
            <Select
              value={selectedAgent}
              label="Filter by Agent"
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <MenuItem value="all">All Agents</MenuItem>
              {/* TODO: Populate with actual agents */}
              <MenuItem value="agent1">Agent 1</MenuItem>
              <MenuItem value="agent2">Agent 2</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh data">
            <IconButton onClick={loadConversationData} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Performance Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Timer color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Average Talk Ratio</Typography>
              </Box>
              <Typography variant="h4">
                {data?.performance ? 
                  Math.round((data.performance.averageTalkTime / (data.performance.averageTalkTime + data.performance.averageListenTime)) * 100) : 0
                }%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Talk vs Listen time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <EmojiEmotions color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg Sentiment</Typography>
              </Box>
              <Typography variant="h4" sx={{ color: getSentimentColor(data?.insights?.averageSentiment || 0) }}>
                {getSentimentLabel(data?.insights?.averageSentiment || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Score: {(data?.insights?.averageSentiment || 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Psychology color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Lead Quality</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round(data?.performance?.averageLeadScore || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average lead score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Conversion Prob</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round((data?.performance?.averageConversionProb || 0) * 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Predicted conversion rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Talk vs Listen Time Analysis
              </Typography>
              {getConversationFlowData() ? (
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={getConversationFlowData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'Minutes' }
                        }
                      },
                      plugins: {
                        legend: { position: 'top' }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Typography color="text.secondary">No conversation data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lead Quality Trends
              </Typography>
              {getLeadScoringTrend() ? (
                <Box sx={{ height: 300 }}>
                  <Line
                    data={getLeadScoringTrend()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          title: { display: true, text: 'Lead Score' }
                        }
                      },
                      plugins: {
                        legend: { position: 'top' }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Typography color="text.secondary">No lead scoring data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Common Objections & Success Patterns */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Warning sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Common Objections
              </Typography>
              <List>
                {data?.insights?.commonObjections?.slice(0, 8).map((objection: string, index: number) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <Chip label={index + 1} size="small" color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={objection}
                      secondary={`Frequency: ${Math.random() * 100 | 0}%`} // TODO: Real frequency data
                    />
                  </ListItem>
                )) || (
                  <Typography color="text.secondary">No objection data available</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CheckCircle sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Success Patterns
              </Typography>
              <List>
                {data?.insights?.successPatterns?.slice(0, 6).map((pattern: any, index: number) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <Chip label={pattern.type} size="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={pattern.description}
                      secondary={pattern.metric}
                    />
                  </ListItem>
                )) || (
                  <Typography color="text.secondary">No success pattern data available</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Improvement Areas */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Lightbulb sx={{ mr: 1, verticalAlign: 'bottom' }} />
            AI-Powered Improvement Recommendations
          </Typography>
          <Grid container spacing={2}>
            {data?.insights?.improvementAreas?.map((area: any, index: number) => (
              <Grid item xs={12} lg={4} key={index}>
                <Box p={2} bgcolor="warning.light" borderRadius={1}>
                  <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
                    <Chip 
                      label={area.priority}
                      color={area.priority === 'HIGH' ? 'error' : 'warning'}
                      size="small"
                    />
                    <Typography variant="subtitle1" fontWeight="bold" ml={1}>
                      {area.area.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {area.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Affects {area.affectedCalls} of calls
                  </Typography>
                </Box>
              </Grid>
            )) || (
              <Grid item xs={12}>
                <Typography color="text.secondary" textAlign="center">
                  No improvement recommendations available
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Top Recommendations */}
      {data?.topRecommendations && data.topRecommendations.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Next Best Actions
            </Typography>
            <List>
              {data.topRecommendations.slice(0, 5).map((recommendation: string, index: number) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    <PlayArrow color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={recommendation} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ConversationIntelligenceReport;