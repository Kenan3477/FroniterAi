/**
 * Compliance Monitoring Report Component
 * Regulatory compliance tracking and violation monitoring
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
  Paper,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  Security,
  Warning,
  CheckCircle,
  Error,
  AccessTime,
  TrendingUp,
  TrendingDown,
  Refresh,
  Download,
  Gavel,
  Phone,
  RecordVoiceOver,
  Schedule,
  Person
} from '@mui/icons-material';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

interface ComplianceReportProps {
  startDate?: string;
  endDate?: string;
  severity?: string;
}

const ComplianceMonitoringReport: React.FC<ComplianceReportProps> = ({
  startDate,
  endDate,
  severity
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState(severity || 'all');
  const [dateRange, setDateRange] = useState('30'); // Days

  useEffect(() => {
    loadComplianceData();
  }, [startDate, endDate, selectedSeverity, dateRange]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      
      // Use dateRange if no specific dates
      if (!startDate && !endDate) {
        const start = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        params.append('startDate', start);
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://froniterai-production.up.railway.app'}/api/advanced-reports/compliance-report?${params.toString()}`,
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
      console.error('Failed to load compliance data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'ABANDONED_CALL': return <Phone />;
      case 'DNC_VIOLATION': return <Gavel />;
      case 'CALL_TIME_VIOLATION': return <Schedule />;
      case 'SCRIPT_DEVIATION': return <RecordVoiceOver />;
      case 'RECORDING_FAILURE': return <Error />;
      case 'CONSENT_VIOLATION': return <Person />;
      default: return <Warning />;
    }
  };

  const getDailyTrendsData = () => {
    if (!data?.dailyTrends) return null;

    return {
      labels: data.dailyTrends.map((day: any) => new Date(day.date).toLocaleDateString()),
      datasets: [{
        label: 'Daily Compliance Events',
        data: data.dailyTrends.map((day: any) => day.eventCount),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: true
      }]
    };
  };

  const getSeverityDistributionData = () => {
    if (!data?.eventsBySeverity) return null;

    return {
      labels: data.eventsBySeverity.map((item: any) => item.severity),
      datasets: [{
        data: data.eventsBySeverity.map((item: any) => item.count),
        backgroundColor: [
          'rgba(244, 67, 54, 0.8)',   // CRITICAL - Red
          'rgba(255, 152, 0, 0.8)',   // HIGH - Orange
          'rgba(33, 150, 243, 0.8)',  // MEDIUM - Blue
          'rgba(76, 175, 80, 0.8)'    // LOW - Green
        ],
        borderColor: [
          'rgb(244, 67, 54)',
          'rgb(255, 152, 0)',
          'rgb(33, 150, 243)',
          'rgb(76, 175, 80)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getEventTypeDistributionData = () => {
    if (!data?.eventsByType) return null;

    return {
      labels: data.eventsByType.map((item: any) => item.type.replace(/_/g, ' ')),
      datasets: [{
        data: data.eventsByType.map((item: any) => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ]
      }]
    };
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h5" gutterBottom>
          <Security sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Compliance Monitoring Report
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Analyzing compliance data and regulatory violations...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error}
          <Button onClick={loadComplianceData} size="small" sx={{ ml: 2 }}>
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
          <Security sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Compliance Monitoring Report
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={selectedSeverity}
              label="Severity"
              onChange={(e) => setSelectedSeverity(e.target.value)}
            >
              <MenuItem value="all">All Severities</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh data">
            <IconButton onClick={loadComplianceData} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<Download />}
            size="small"
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Compliance Score Overview */}
      <Card sx={{ mb: 4, bgcolor: getComplianceScoreColor(data?.complianceScore || 0) + '.light' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" color={getComplianceScoreColor(data?.complianceScore || 0) + '.main'}>
                {data?.complianceScore || 0}/100
              </Typography>
              <Typography variant="h6">
                Overall Compliance Score
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data?.complianceScore >= 90 ? 'Excellent compliance rating' :
                 data?.complianceScore >= 75 ? 'Good compliance with room for improvement' :
                 'Compliance issues require immediate attention'}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="h6">
                Risk Level: <Chip 
                  label={data?.riskAssessment?.level || 'UNKNOWN'}
                  color={getSeverityColor(data?.riskAssessment?.level)}
                />
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {data?.totalEvents || 0} total events | {data?.unresolvedCount || 0} unresolved
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Error color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Critical Events</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {data?.eventsBySeverity?.find((s: any) => s.severity === 'CRITICAL')?.count || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require immediate action
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">High Priority</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {data?.eventsBySeverity?.find((s: any) => s.severity === 'HIGH')?.count || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Need prompt attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccessTime color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Unresolved</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {data?.unresolvedCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending resolution
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Resolution Rate</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {data?.totalEvents > 0 ? 
                  Math.round(((data.totalEvents - data.unresolvedCount) / data.totalEvents) * 100) : 100
                }%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Event resolution efficiency
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
                Daily Compliance Trend
              </Typography>
              {getDailyTrendsData() ? (
                <Box sx={{ height: 300 }}>
                  <Line
                    data={getDailyTrendsData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'Number of Events' }
                        }
                      },
                      plugins: {
                        legend: { position: 'top' }
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

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Events by Severity
              </Typography>
              {getSeverityDistributionData() ? (
                <Box sx={{ height: 300 }}>
                  <Doughnut
                    data={getSeverityDistributionData()!}
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
                <Typography color="text.secondary">No severity data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Event Type Distribution
              </Typography>
              {getEventTypeDistributionData() ? (
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={getEventTypeDistributionData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'Number of Events' }
                        }
                      },
                      plugins: {
                        legend: { display: false }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Typography color="text.secondary">No event type data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Assessment
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Badge badgeContent={data?.riskAssessment?.factors?.criticalEvents || 0} color="error">
                      <Error color="error" />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary="Critical Events"
                    secondary={`${data?.riskAssessment?.factors?.criticalEvents || 0} events requiring immediate action`}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Badge badgeContent={data?.riskAssessment?.factors?.unresolvedEvents || 0} color="warning">
                      <AccessTime color="warning" />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary="Unresolved Events"
                    secondary={`${data?.riskAssessment?.factors?.unresolvedEvents || 0} pending resolution`}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {data?.riskAssessment?.factors?.trendDirection === 'INCREASING' ? 
                      <TrendingUp color="error" /> : 
                      <TrendingDown color="success" />
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary="Trend Direction"
                    secondary={data?.riskAssessment?.factors?.trendDirection || 'STABLE'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Unresolved Events */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Unresolved Compliance Events
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Event Type</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Agent</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.unresolvedEvents?.slice(0, 10).map((event: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {getEventIcon(event.eventType)}
                            <Typography variant="body2" ml={1}>
                              {event.eventType.replace(/_/g, ' ')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={event.severity}
                            color={getSeverityColor(event.severity)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {event.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(event.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {event.agentId || 'System'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            color={getSeverityColor(event.severity)}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary">
                            No unresolved compliance events
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Compliance Recommendations */}
      {data?.recommendations && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Improvement Recommendations
            </Typography>
            <Grid container spacing={2}>
              {data.recommendations.map((recommendation: any, index: number) => (
                <Grid item xs={12} lg={4} key={index}>
                  <Box p={2} bgcolor="warning.light" borderRadius={1}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Chip 
                        label={recommendation.priority}
                        color={recommendation.priority === 'IMMEDIATE' ? 'error' : 'warning'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {recommendation.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {recommendation.description}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Action:</strong> {recommendation.action}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ComplianceMonitoringReport;