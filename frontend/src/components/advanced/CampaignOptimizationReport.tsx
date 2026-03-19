/**
 * Campaign Optimization Report Component
 * AI-powered campaign performance analysis and optimization recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Campaign,
  TrendingUp,
  TrendingDown,
  AccessTime,
  Phone,
  Star,
  Lightbulb,
  PlayArrow,
  Refresh,
  Timeline,
  Assessment,
  MonetizationOn,
  Speed
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

interface CampaignOptimizationProps {
  campaignId?: string;
  dataListId?: string;
}

const CampaignOptimizationReport: React.FC<CampaignOptimizationProps> = ({
  campaignId,
  dataListId
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState(campaignId || 'all');

  useEffect(() => {
    loadOptimizationData();
  }, [campaignId, dataListId, selectedCampaign]);

  const loadOptimizationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (selectedCampaign !== 'all') params.append('campaignId', selectedCampaign);
      if (dataListId) params.append('dataListId', dataListId);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://froniterai-production.up.railway.app'}/api/advanced-reports/campaign-optimization?${params.toString()}`,
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
      console.error('Failed to load campaign optimization:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceTrendData = () => {
    if (!data?.historical) return null;

    const last30Days = data.historical.slice(-30);
    return {
      labels: last30Days.map((day: any) => new Date(day.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Contact Rate (%)',
          data: last30Days.map((day: any) => day.contactRate * 100),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Conversion Rate (%)',
          data: last30Days.map((day: any) => day.conversionRate * 100),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          yAxisID: 'y'
        }
      ]
    };
  };

  const getROITrendData = () => {
    if (!data?.historical) return null;

    const recentData = data.historical.filter((day: any) => day.roi !== null).slice(-14);
    return {
      labels: recentData.map((day: any) => new Date(day.date).toLocaleDateString()),
      datasets: [{
        label: 'ROI (%)',
        data: recentData.map((day: any) => day.roi),
        backgroundColor: recentData.map((day: any) => 
          day.roi > 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'
        ),
        borderColor: recentData.map((day: any) => 
          day.roi > 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'
        ),
        borderWidth: 1
      }]
    };
  };

  const getTimeDistributionData = () => {
    if (!data?.predictions?.recommendedTiming) return null;

    const timing = data.predictions.recommendedTiming.slice(0, 8);
    return {
      labels: timing.map((slot: any) => `${slot.hour}:00`),
      datasets: [{
        label: 'Conversion Rate (%)',
        data: timing.map((slot: any) => slot.conversionRate * 100),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)'
        ]
      }]
    };
  };

  const getPriorityScore = (priority: string) => {
    switch (priority) {
      case 'HIGH': return { color: 'error', score: 3 };
      case 'MEDIUM': return { color: 'warning', score: 2 };
      case 'LOW': return { color: 'info', score: 1 };
      default: return { color: 'default', score: 0 };
    }
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h5" gutterBottom>
          <Campaign sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Campaign Optimization Report
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Analyzing campaign performance and generating optimization recommendations...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error}
          <Button onClick={loadOptimizationData} size="small" sx={{ ml: 2 }}>
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
          <Campaign sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Campaign Optimization Report
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Select Campaign</InputLabel>
            <Select
              value={selectedCampaign}
              label="Select Campaign"
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              <MenuItem value="all">All Campaigns</MenuItem>
              {/* TODO: Populate with actual campaigns */}
              <MenuItem value="campaign1">Sales Campaign 1</MenuItem>
              <MenuItem value="campaign2">Lead Gen Campaign</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh data">
            <IconButton onClick={loadOptimizationData} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Current Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Phone color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Calls</Typography>
              </Box>
              <Typography variant="h4">
                {data?.current?.totalCalls?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last 24 hours
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Assessment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Contact Rate</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round((data?.current?.contactRate || 0) * 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data?.trends?.direction === 'IMPROVING' ? '↗️' : '↘️'} vs previous period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Conversion Rate</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round((data?.current?.conversionRate || 0) * 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Campaign performance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Star color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Lead Quality</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round(data?.current?.leadQuality || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average AI score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends (Last 30 Days)
              </Typography>
              {getPerformanceTrendData() ? (
                <Box sx={{ height: 300 }}>
                  <Line
                    data={getPerformanceTrendData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          title: { display: true, text: 'Rate (%)' }
                        }
                      },
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: false }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Typography color="text.secondary">No trend data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Optimal Call Times
              </Typography>
              {getTimeDistributionData() ? (
                <Box sx={{ height: 300 }}>
                  <Doughnut
                    data={getTimeDistributionData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Typography color="text.secondary">No timing data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ROI Analysis */}
      {data?.historical && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ROI Analysis (Last 14 Days)
            </Typography>
            {getROITrendData() ? (
              <Box sx={{ height: 250 }}>
                <Bar
                  data={getROITrendData()!}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'ROI (%)' }
                      }
                    },
                    plugins: {
                      legend: { position: 'top' }
                    }
                  }}
                />
              </Box>
            ) : (
              <Typography color="text.secondary">No ROI data available</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Timeline sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Predictive Analytics
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <MonetizationOn color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Predicted ROI"
                    secondary={`${Math.round(data?.predictions?.predictedROI || 0)}% for next period`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AccessTime color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Time to Completion"
                    secondary={`${data?.predictions?.timeToComplete || 0} days estimated`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Speed color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Recommended Pace"
                    secondary="Increase by 15% for optimal coverage"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data List Prioritization
              </Typography>
              {data?.predictions?.listPriority ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>List ID</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.predictions.listPriority.map((list: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{list.listId}</TableCell>
                          <TableCell>
                            <Chip 
                              label={list.priority}
                              color={getPriorityScore(list.priority).color}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{list.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No prioritization data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Optimization Recommendations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Lightbulb sx={{ mr: 1, verticalAlign: 'bottom' }} />
            AI Optimization Recommendations
          </Typography>
          <Grid container spacing={2}>
            {data?.recommendations?.map((recommendation: any, index: number) => (
              <Grid item xs={12} lg={4} key={index}>
                <Box p={2} bgcolor="primary.light" borderRadius={1} height="100%">
                  <Box display="flex" alignItems="center" mb={1}>
                    <Chip 
                      label={recommendation.priority}
                      color={getPriorityScore(recommendation.priority).color}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {recommendation.title}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {recommendation.description}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <TrendingUp fontSize="small" color="success" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      {recommendation.impact}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                    <strong>Action:</strong> {recommendation.action}
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PlayArrow />}
                    fullWidth
                  >
                    Implement
                  </Button>
                </Box>
              </Grid>
            )) || (
              <Grid item xs={12}>
                <Typography color="text.secondary" textAlign="center">
                  No optimization recommendations available
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CampaignOptimizationReport;