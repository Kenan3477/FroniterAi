import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Shield, 
  Activity, 
  Eye, 
  Clock, 
  AlertTriangle,
  Download,
  Search,
  Filter,
  BarChart3,
  User,
  MousePointer,
  Monitor,
  Calendar,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock3
} from 'lucide-react';

// Types for Advanced Audit System
interface UserActivityLog {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  sessionId: string;
  activityType: string;
  elementType?: string;
  elementId?: string;
  pagePath: string;
  pageTitle?: string;
  timeOnPage?: number;
  clickData?: any;
  metadata?: any;
  timestamp: string;
}

interface SuspiciousActivityAlert {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  detectionData: any;
  reviewStatus: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  isActive: boolean;
  triggeredAt: string;
}

interface UserBehaviorAnalytics {
  userId: number;
  userName: string;
  userEmail: string;
  totalActivities: number;
  averageSessionDuration: number;
  mostActiveHours: number[];
  topPages: Array<{ page: string; visits: number }>;
  clickPatterns: {
    totalClicks: number;
    averageClicksPerPage: number;
    rapidClickingEvents: number;
  };
  suspiciousScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  lastActivity: string;
}

interface ActivityFilter {
  userId?: number;
  activityType?: string;
  dateFrom?: string;
  dateTo?: string;
  pagePath?: string;
}

interface AlertFilter {
  alertType?: string;
  severity?: string;
  reviewStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AdvancedAuditDashboardProps {
  organizationId: string;
}

export default function AdvancedAuditDashboard({ organizationId }: AdvancedAuditDashboardProps) {
  // State management
  const [userActivities, setUserActivities] = useState<UserActivityLog[]>([]);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState<SuspiciousActivityAlert[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserBehaviorAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activities');
  const [selectedAlert, setSelectedAlert] = useState<SuspiciousActivityAlert | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Filters
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>({});
  const [alertFilter, setAlertFilter] = useState<AlertFilter>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  // Real-time updates
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);

  // API helper functions
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load audit data
  const loadAuditData = useCallback(async () => {
    try {
      setLoading(true);

      const [activitiesResponse, alertsResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/admin/advanced-audit/organization/${organizationId}/activities?page=${currentPage}&pageSize=${pageSize}&${new URLSearchParams(activityFilter)}`, {
          headers: getAuthHeaders()
        }),
        fetch(`/api/admin/advanced-audit/organization/${organizationId}/alerts?${new URLSearchParams(alertFilter)}`, {
          headers: getAuthHeaders()
        }),
        fetch(`/api/admin/advanced-audit/organization/${organizationId}/analytics`, {
          headers: getAuthHeaders()
        })
      ]);

      if (activitiesResponse.ok && alertsResponse.ok && analyticsResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        const alertsData = await alertsResponse.json();
        const analyticsData = await analyticsResponse.json();

        setUserActivities(activitiesData.data.activities || []);
        setTotalPages(activitiesData.data.pagination?.totalPages || 1);
        setSuspiciousAlerts(alertsData.data || []);
        setUserAnalytics(analyticsData.data || []);
      } else {
        console.error('Failed to load audit data');
      }
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentPage, activityFilter, alertFilter]);

  // Track user activity (client-side tracking)
  const trackUserActivity = useCallback(async (activityType: string, elementData?: any) => {
    try {
      const sessionId = sessionStorage.getItem('sessionId') || 'unknown';
      
      await fetch('/api/admin/advanced-audit/track', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organizationId,
          sessionId,
          activityType,
          elementType: elementData?.tagName,
          elementId: elementData?.id,
          pagePath: window.location.pathname,
          pageTitle: document.title,
          clickData: elementData ? {
            x: elementData.clientX,
            y: elementData.clientY,
            target: elementData.target?.tagName
          } : undefined,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          }
        })
      });
    } catch (error) {
      console.error('Failed to track user activity:', error);
    }
  }, [organizationId]);

  // Review suspicious alert
  const reviewAlert = async (alertId: string, status: string, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/advanced-audit/alerts/${alertId}/review`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reviewStatus: status,
          reviewNotes: notes
        })
      });

      if (response.ok) {
        await loadAuditData();
        setIsReviewDialogOpen(false);
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error('Failed to review alert:', error);
    }
  };

  // Export audit logs
  const exportAuditLogs = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch(`/api/admin/advanced-audit/organization/${organizationId}/export?format=${format}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${organizationId}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    }
  };

  // Setup real-time updates
  useEffect(() => {
    if (isRealTimeEnabled && typeof window !== 'undefined') {
      const interval = setInterval(() => {
        loadAuditData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isRealTimeEnabled, loadAuditData]);

  // Setup client-side activity tracking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Track page views
      trackUserActivity('page_view');

      // Track clicks
      const handleClick = (event: MouseEvent) => {
        trackUserActivity('click', event);
      };

      // Track tab switches
      const handleVisibilityChange = () => {
        trackUserActivity(document.hidden ? 'tab_hidden' : 'tab_visible');
      };

      // Track idle detection
      let idleTimer: NodeJS.Timeout;
      const handleActivity = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          trackUserActivity('idle_start');
        }, 300000); // 5 minutes of inactivity
      };

      document.addEventListener('click', handleClick);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('mousemove', handleActivity);
      document.addEventListener('keypress', handleActivity);

      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('mousemove', handleActivity);
        document.removeEventListener('keypress', handleActivity);
        clearTimeout(idleTimer);
      };
    }
  }, [trackUserActivity]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  // Filter functions
  const filteredActivities = userActivities.filter(activity => {
    const matchesSearch = searchTerm === '' || 
      activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.pagePath.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const filteredAlerts = suspiciousAlerts.filter(alert => {
    const matchesSearch = searchTerm === '' ||
      alert.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Get activity type icon
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'click': return <MousePointer className="w-4 h-4" />;
      case 'page_view': return <Eye className="w-4 h-4" />;
      case 'tab_switch': return <Monitor className="w-4 h-4" />;
      case 'idle_start': return <Clock3 className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading advanced audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Advanced Audit System
          </h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive user activity tracking and suspicious behavior detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isRealTimeEnabled ? "default" : "outline"}
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            className="gap-2"
          >
            <Activity className="w-4 h-4" />
            {isRealTimeEnabled ? 'Live' : 'Manual'}
          </Button>
          <Button onClick={() => exportAuditLogs('csv')} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold text-foreground">{userActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suspicious Alerts</p>
                <p className="text-2xl font-bold text-foreground">{suspiciousAlerts.filter(a => a.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold text-foreground">
                  {suspiciousAlerts.filter(a => a.reviewStatus === 'PENDING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <User className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monitored Users</p>
                <p className="text-2xl font-bold text-foreground">{userAnalytics.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users, activities, or alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button onClick={() => loadAuditData()} variant="outline" className="gap-2">
              <Activity className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activities" className="gap-2">
            <Activity className="w-4 h-4" />
            User Activities
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Suspicious Alerts
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            User Analytics
          </TabsTrigger>
        </TabsList>

        {/* User Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent User Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Time on Page</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{activity.userName}</div>
                            <div className="text-sm text-muted-foreground">{activity.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActivityIcon(activity.activityType)}
                            <span className="capitalize">{activity.activityType.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{activity.pagePath}</div>
                            {activity.pageTitle && (
                              <div className="text-sm text-muted-foreground">{activity.pageTitle}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDuration(activity.timeOnPage)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(activity.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspicious Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suspicious Activity Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Alert</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Triggered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.userName}</div>
                            <div className="text-sm text-muted-foreground">{alert.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm text-muted-foreground">{alert.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-white ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.reviewStatus === 'RESOLVED' ? 'default' : 'secondary'}>
                            {alert.reviewStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(alert.triggeredAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setIsReviewDialogOpen(true);
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Behavior Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Activities</TableHead>
                      <TableHead>Avg Session</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userAnalytics.map((analytics) => (
                      <TableRow key={analytics.userId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{analytics.userName}</div>
                            <div className="text-sm text-muted-foreground">{analytics.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{analytics.totalActivities}</div>
                            <div className="text-sm text-muted-foreground">
                              {analytics.clickPatterns.totalClicks} clicks
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDuration(analytics.averageSessionDuration)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={analytics.riskLevel === 'HIGH' ? 'destructive' : 'secondary'}
                            className={analytics.riskLevel === 'MEDIUM' ? 'bg-yellow-500 text-white' : ''}
                          >
                            {analytics.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(analytics.lastActivity).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Suspicious Activity Alert</DialogTitle>
            <DialogDescription>
              Review and take action on this suspicious activity alert
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm">{selectedAlert.userName} ({selectedAlert.userEmail})</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Severity</Label>
                  <Badge className={`text-white ${getSeverityColor(selectedAlert.severity)} ml-2`}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Alert Title</Label>
                <p className="text-sm">{selectedAlert.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm">{selectedAlert.description}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Detection Data</Label>
                <pre className="text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-y-auto">
                  {JSON.stringify(selectedAlert.detectionData, null, 2)}
                </pre>
              </div>
              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea 
                  id="reviewNotes"
                  placeholder="Add your review notes..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => selectedAlert && reviewAlert(selectedAlert.id, 'FALSE_POSITIVE')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              False Positive
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedAlert && reviewAlert(selectedAlert.id, 'INVESTIGATING')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Investigate
            </Button>
            <Button
              onClick={() => selectedAlert && reviewAlert(selectedAlert.id, 'RESOLVED')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}