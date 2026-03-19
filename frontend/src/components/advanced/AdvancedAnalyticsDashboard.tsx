/**
 * Advanced AI Dialler Analytics Dashboard
 * Enterprise-grade reporting dashboard with real-time metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Refresh,
  Download,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Phone,
  Psychology,
  Campaign,
  Security,
  Group,
  Analytics,
  Dashboard,
  Timeline
} from '@mui/icons-material';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js';

// Chart.js registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

interface AdvancedAnalyticsDashboardProps {
  organizationId?: string;
  userRole: string;
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  organizationId,
  userRole
}) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [diallerMetrics, setDiallerMetrics] = useState<any>(null);
  const [conversationIntelligence, setConversationIntelligence] = useState<any>(null);
  const [campaignOptimization, setCampaignOptimization] = useState<any>(null);
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [agentPerformance, setAgentPerformance] = useState<any>(null);
  const [leadScoring, setLeadScoring] = useState<any>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<any>(null);

  // Filter states
  const [dateRange, setDateRange] = useState('7'); // Days
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  
  // Auto-refresh
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ==========================================
  // API FUNCTIONS
  // ==========================================
  
  const apiCall = async (endpoint: string, params: Record<string, any> = {}) => {
    const token = localStorage.getItem('token');
    const queryParams = new URLSearchParams(params).toString();
    const url = `${process.env.REACT_APP_API_URL || 'https://froniterai-production.up.railway.app'}/api/advanced-reports/${endpoint}${queryParams ? '?' + queryParams : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  };

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      const filters = {
        dateRange: dateRange !== 'all' ? new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
        campaignId: selectedCampaign !== 'all' ? selectedCampaign : undefined,
        agentId: selectedAgent !== 'all' ? selectedAgent : undefined
      };

      // Load all dashboard data in parallel
      const [
        dashboardRes,
        diallerRes,
        conversationRes,
        campaignRes,
        complianceRes,
        agentRes,
        leadRes,
        statusRes
      ] = await Promise.all([
        apiCall('dashboard-summary'),
        apiCall('dialler-metrics', filters),
        apiCall('conversation-intelligence', filters),
        apiCall('campaign-optimization', filters),
        apiCall('compliance-report', filters),
        apiCall('agent-performance', filters),
        apiCall('lead-scoring', filters),
        apiCall('real-time-status')
      ]);

      setDashboardSummary(dashboardRes.data);
      setDiallerMetrics(diallerRes.data);
      setConversationIntelligence(conversationRes.data);
      setCampaignOptimization(campaignRes.data);
      setComplianceReport(complianceRes.data);
      setAgentPerformance(agentRes.data);
      setLeadScoring(leadRes.data);
      setRealTimeStatus(statusRes.data);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Dashboard data loading failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // ==========================================
  // EFFECTS
  // ==========================================
  
  useEffect(() => {
    setLoading(true);
    loadDashboardData().finally(() => setLoading(false));
  }, [dateRange, selectedCampaign, selectedAgent]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadDashboardData();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, dateRange, selectedCampaign, selectedAgent]);

  // ==========================================
  // CHART CONFIGURATIONS
  // ==========================================
  
  const getDiallerMetricsChartData = () => {
    if (!diallerMetrics?.historical) return null;
    
    return {
      labels: diallerMetrics.historical.map((m: any) => 
        new Date(m.timestamp).toLocaleDateString()
      ).slice(-7), // Last 7 days
      datasets: [
        {
          label: 'Pacing Ratio',
          data: diallerMetrics.historical.map((m: any) => m.pacingRatio).slice(-7),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Agent Utilization (%)',
          data: diallerMetrics.historical.map((m: any) => m.agentUtilization * 100).slice(-7),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    };
  };

  const getSentimentDistributionData = () => {
    if (!conversationIntelligence?.sentimentDistribution) return null;
    
    const dist = conversationIntelligence.sentimentDistribution;
    return {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [dist.positive * 100, dist.neutral * 100, dist.negative * 100],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getComplianceScoreData = () => {
    if (!complianceReport) return null;
    
    return {
      labels: ['Compliance Score', 'Risk Level', 'Event Resolution'],
      datasets: [{
        label: 'Compliance Metrics',
        data: [
          complianceReport.complianceScore || 0,
          complianceReport.riskAssessment?.score || 0,
          complianceReport.totalEvents > 0 ? 
            ((complianceReport.totalEvents - complianceReport.unresolvedCount) / complianceReport.totalEvents) * 100 : 100
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        pointBackgroundColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff'
      }]
    };
  };

  // ==========================================
  // METRIC CARDS COMPONENT
  // ==========================================
  
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: number;
    icon: React.ReactNode;
    status?: 'success' | 'warning' | 'error' | 'info';
    loading?: boolean;
  }> = ({ title, value, subtitle, trend, icon, status = 'info', loading = false }) => {
    
    const getStatusColor = () => {
      switch (status) {
        case 'success': return 'success.main';
        case 'warning': return 'warning.main';
        case 'error': return 'error.main';
        default: return 'primary.main';
      }
    };

    const getTrendIcon = () => {
      if (trend === undefined) return null;
      return trend >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />;
    };

    return (
      <Card elevation={3} sx={{ height: '100%', position: 'relative' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Box sx={{ color: getStatusColor(), mr: 1 }}>
              {icon}
            </Box>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            {getTrendIcon()}
          </Box>
          
          {loading ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Typography variant="h4" component="div" color="text.primary" mb={1}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
              {trend !== undefined && (
                <Typography 
                  variant="body2" 
                  color={trend >= 0 ? 'success.main' : 'error.main'}
                  mt={1}
                >
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs previous period
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" ml={2}>
          Loading Advanced AI Analytics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <Dashboard sx={{ mr: 1, verticalAlign: 'bottom' }} />
            Advanced AI Dialler Analytics
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Enterprise-grade predictive analytics and performance intelligence
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          {/* Filters */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="1">Last 24 hours</MenuItem>
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Auto-refresh every 30 seconds">
            <Button
              variant={autoRefresh ? "contained" : "outlined"}
              size="small"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto-refresh
            </Button>
          </Tooltip>

          <Tooltip title="Refresh data">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              color="primary"
            >
              {refreshing ? <CircularProgress size={20} /> : <Refresh />}
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<Download />}
            size="small"
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={handleRefresh} size="small" sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Real-time Status Bar */}
      {realTimeStatus && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" color="primary.contrastText">
                Live System Status
              </Typography>
              <Box display="flex" gap={4} alignItems="center">
                <Box textAlign="center">
                  <Typography variant="h6" color="primary.contrastText">
                    {realTimeStatus.activeCalls || 0}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Active Calls
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h6" color="primary.contrastText">
                    {realTimeStatus.agentsOnline || 0}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Agents Online
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h6" color="primary.contrastText">
                    {realTimeStatus.currentPacingRatio || 0}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Pacing Ratio
                  </Typography>
                </Box>
                <Chip
                  label={realTimeStatus.systemHealth || 'UNKNOWN'}
                  color={realTimeStatus.systemHealth === 'HEALTHY' ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={2}>
          <MetricCard
            title="Pacing Ratio"
            value={diallerMetrics?.current?.pacingRatio?.toFixed(2) || '0.00'}
            subtitle="Current predictive ratio"
            trend={diallerMetrics?.trends?.pacingTrend}
            icon={<Phone />}
            status={diallerMetrics?.compliance?.complianceStatus === 'COMPLIANT' ? 'success' : 'warning'}
            loading={!diallerMetrics}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={2}>
          <MetricCard
            title="Agent Utilization"
            value={`${Math.round((diallerMetrics?.current?.agentUtilization || 0) * 100)}%`}
            subtitle="Current efficiency"
            trend={diallerMetrics?.trends?.utilizationTrend}
            icon={<Group />}
            status={(diallerMetrics?.current?.agentUtilization || 0) > 0.8 ? 'success' : 'warning'}
            loading={!diallerMetrics}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={2}>
          <MetricCard
            title="Conversion Rate"
            value={`${Math.round((campaignOptimization?.current?.conversionRate || 0) * 100)}%`}
            subtitle="Current campaign performance"
            icon={<TrendingUp />}
            status={(campaignOptimization?.current?.conversionRate || 0) > 0.05 ? 'success' : 'warning'}
            loading={!campaignOptimization}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={2}>
          <MetricCard
            title="Lead Quality"
            value={Math.round(conversationIntelligence?.performance?.averageLeadScore || 0)}
            subtitle="AI lead scoring average"
            icon={<Psychology />}
            status={(conversationIntelligence?.performance?.averageLeadScore || 0) > 70 ? 'success' : 'warning'}
            loading={!conversationIntelligence}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={2}>
          <MetricCard
            title="Compliance Score"
            value={complianceReport?.complianceScore || 0}
            subtitle="Current compliance rating"
            icon={<Security />}
            status={(complianceReport?.complianceScore || 0) > 90 ? 'success' : 
                   (complianceReport?.complianceScore || 0) > 75 ? 'warning' : 'error'}
            loading={!complianceReport}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={2}>
          <MetricCard
            title="Abandonment Rate"
            value={`${Math.round((diallerMetrics?.current?.abandonedCallRate || 0) * 100)}%`}
            subtitle="Regulatory compliance"
            icon={<Warning />}
            status={(diallerMetrics?.current?.abandonedCallRate || 0) < 0.03 ? 'success' : 'error'}
            loading={!diallerMetrics}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Dialler Performance Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Predictive Dialler Performance Trends
              </Typography>
              {getDiallerMetricsChartData() ? (
                <Box sx={{ height: 300 }}>
                  <Line
                    data={getDiallerMetricsChartData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          title: { display: true, text: 'Pacing Ratio' }
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          title: { display: true, text: 'Utilization %' },
                          grid: { drawOnChartArea: false }
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
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sentiment Analysis */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conversation Sentiment Distribution
              </Typography>
              {getSentimentDistributionData() ? (
                <Box sx={{ height: 300 }}>
                  <Doughnut
                    data={getSentimentDistributionData()!}
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
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Compliance & Risk Assessment */}
      {complianceReport && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Risk Assessment
                </Typography>
                {getComplianceScoreData() ? (
                  <Box sx={{ height: 300 }}>
                    <Radar
                      data={getComplianceScoreData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            beginAtZero: true,
                            max: 100,
                            pointLabels: { font: { size: 12 } }
                          }
                        },
                        plugins: {
                          legend: { display: false }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                    <Typography color="text.secondary">No data available</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Compliance Events
                </Typography>
                <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
                  {complianceReport.unresolvedEvents?.slice(0, 10).map((event: any, index: number) => (
                    <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="bold">
                          {event.eventType.replace(/_/g, ' ')}
                        </Typography>
                        <Chip 
                          label={event.severity} 
                          size="small"
                          color={event.severity === 'CRITICAL' ? 'error' : 
                                event.severity === 'HIGH' ? 'warning' : 'default'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {event.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )) || (
                    <Typography color="text.secondary" textAlign="center">
                      No unresolved compliance events
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Top Performing Agents */}
      {agentPerformance?.topPerformers && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performing Agents
            </Typography>
            <Grid container spacing={2}>
              {agentPerformance.topPerformers.slice(0, 6).map((agent: any, index: number) => (
                <Grid item xs={12} sm={6} lg={2} key={index}>
                  <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                    <Typography variant="h6">
                      {agent.agentName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Score: {Math.round(agent.performanceScore)}
                    </Typography>
                    <Typography variant="body2">
                      {Math.round(agent.metrics.conversionRate * 100)}% conversion
                    </Typography>
                    <Chip 
                      label={`#${index + 1}`}
                      color="primary"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Campaign Recommendations */}
      {campaignOptimization?.recommendations && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI-Powered Campaign Optimization Recommendations
            </Typography>
            <Grid container spacing={2}>
              {campaignOptimization.recommendations.slice(0, 3).map((rec: any, index: number) => (
                <Grid item xs={12} lg={4} key={index}>
                  <Box p={2} bgcolor="primary.light" borderRadius={1}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Chip 
                        label={rec.priority}
                        color={rec.priority === 'HIGH' ? 'error' : 
                               rec.priority === 'MEDIUM' ? 'warning' : 'info'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {rec.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {rec.description}
                    </Typography>
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      {rec.impact}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Action: {rec.action}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Box mt={4} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          Last updated: {lastUpdated.toLocaleString()} | 
          Auto-refresh: {autoRefresh ? 'Enabled' : 'Disabled'} | 
          Data refreshes every 30 seconds
        </Typography>
      </Box>
    </Box>
  );
};

export default AdvancedAnalyticsDashboard;