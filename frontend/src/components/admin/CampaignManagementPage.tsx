import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEventSystem, useCampaignEvents, useSystemNotifications } from '@/contexts/EventSystemContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  BarChart3, 
  Target, 
  Users,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  TrendingUp,
  Eye,
  Settings,
  UserPlus,
  UserMinus,
  Power,
  Clock,
  Zap
} from 'lucide-react';

interface CampaignTemplate {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'SALES' | 'MARKETING' | 'SUPPORT' | 'SURVEYS' | 'COLLECTIONS' | 'NURTURE';
  type: 'OUTBOUND' | 'INBOUND' | 'BLENDED' | 'EMAIL' | 'SMS' | 'MULTICHANNEL';
  dialingMode: 'PREDICTIVE' | 'PROGRESSIVE' | 'PREVIEW' | 'MANUAL';
  maxCallsPerAgent: number;
  maxAttemptsPerRecord: number;
  abandonRateThreshold: number;
  pacingMultiplier: number;
  defaultTimezone: string;
  dialingStart?: string;
  dialingEnd?: string;
  openingScript?: string;
  closingScript?: string;
  emailTemplate?: string;
  smsTemplate?: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    campaigns: number;
  };
}

interface ManagementCampaign {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: 'OUTBOUND' | 'INBOUND' | 'BLENDED' | 'EMAIL' | 'SMS' | 'MULTICHANNEL';
  category: 'SALES' | 'MARKETING' | 'SUPPORT' | 'SURVEYS' | 'COLLECTIONS' | 'NURTURE';
  priority: number;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
  scheduledStart?: string;
  scheduledEnd?: string;
  totalTargets: number;
  totalCalls: number;
  totalConnections: number;
  totalConversions: number;
  totalRevenue: number;
  budget?: number;
  budgetCurrency: string;
  targetCalls?: number;
  targetConnections?: number;
  targetConversions?: number;
  targetRevenue?: number;
  createdAt: string;
  // Dial Queue Properties
  dialMethod: 'AUTODIAL' | 'MANUAL_DIAL' | 'MANUAL_PREVIEW' | 'SKIP';
  dialSpeed: number; // Calls per minute for autodial
  outboundNumber?: string; // CLI (Caller Line Identification) number for outbound calls
  isActive: boolean; // Whether the campaign is actively dialing
  agentCount: number; // Number of agents assigned to this campaign
  queuePosition?: number; // Position in dial queue
  predictiveDialingEnabled: boolean;
  maxConcurrentCalls: number;
  template?: {
    id: string;
    name: string;
    displayName: string;
  };
  organization?: {
    id: string;
    name: string;
    displayName: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    targets: number;
    assignments: number;
    results: number;
  };
}

interface CampaignStats {
  overview: {
    totalCampaigns: number;
    totalTemplates: number;
    totalTargets: number;
    totalResults: number;
  };
  breakdown: {
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  recentCampaigns: ManagementCampaign[];
  topPerformingCampaigns: ManagementCampaign[];
}

const CampaignManagementPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<ManagementCampaign[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<ManagementCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time event system integration
  const { connectionStatus, connect } = useEventSystem();
  const campaignEvents = useCampaignEvents();
  const systemNotifications = useSystemNotifications();

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isCampaignViewDialogOpen, setIsCampaignViewDialogOpen] = useState(false);
  const [isCampaignEditDialogOpen, setIsCampaignEditDialogOpen] = useState(false);
  const [isQueueViewDialogOpen, setIsQueueViewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplate | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<ManagementCampaign | null>(null);

  const [templateForm, setTemplateForm] = useState<Partial<CampaignTemplate>>({
    category: 'SALES',
    type: 'OUTBOUND',
    dialingMode: 'PROGRESSIVE',
    maxCallsPerAgent: 1,
    maxAttemptsPerRecord: 3,
    abandonRateThreshold: 0.05,
    pacingMultiplier: 1.0,
    defaultTimezone: 'UTC',
  });

  const [campaignForm, setCampaignForm] = useState<Partial<ManagementCampaign>>({
    category: 'SALES',
    type: 'OUTBOUND',
    priority: 1,
    status: 'DRAFT',
    budgetCurrency: 'USD',
    dialMethod: 'MANUAL_DIAL',
    dialSpeed: 60,
    isActive: false,
    agentCount: 0,
    predictiveDialingEnabled: false,
    maxConcurrentCalls: 10,
  });

  // Dial Queue Handlers
  const handleDialMethodChange = async (campaignId: string, dialMethod: ManagementCampaign['dialMethod']) => {
    try {
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaignId}/dial-method`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialMethod }),
      });

      if (response.ok) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, dialMethod } : c
        ));
      }
    } catch (error) {
      console.error('Failed to update dial method:', error);
    }
  };

  const handleActivateToggle = async (campaignId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaignId}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, isActive } : c
        ));
      }
    } catch (error) {
      console.error('Failed to toggle campaign activation:', error);
    }
  };

  const handleDialSpeedChange = async (campaignId: string, dialSpeed: number) => {
    try {
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaignId}/dial-speed`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialSpeed }),
      });

      if (response.ok) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, dialSpeed } : c
        ));
      }
    } catch (error) {
      console.error('Failed to update dial speed:', error);
    }
  };

  const handleAgentJoin = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaignId}/join-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, agentCount: c.agentCount + 1 } : c
        ));
      }
    } catch (error) {
      console.error('Failed to join agent to campaign:', error);
    }
  };

  const handleAgentLeave = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaignId}/leave-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, agentCount: Math.max(0, c.agentCount - 1) } : c
        ));
      }
    } catch (error) {
      console.error('Failed to remove agent from campaign:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time event handling
  useEffect(() => {
    // Auto-connect to event system (you'd get the token from your auth context)
    const token = localStorage.getItem('authToken'); // Adjust based on your auth implementation
    if (token && connectionStatus === 'disconnected') {
      connect(token);
    }
  }, [connectionStatus, connect]);

  // Handle real-time campaign events
  useEffect(() => {
    campaignEvents.forEach(event => {
      console.log('📡 Received campaign event:', event);
      
      switch (event.type) {
        case 'campaign.dial.speed.changed':
          if (event.campaignId && event.dialSpeed) {
            setCampaigns(prev => prev.map(c => 
              c.id === event.campaignId ? { ...c, dialSpeed: event.dialSpeed! } : c
            ));
          }
          break;

        case 'campaign.dial.method.changed':
          if (event.campaignId && event.dialMethod) {
            setCampaigns(prev => prev.map(c => 
              c.id === event.campaignId ? { ...c, dialMethod: event.dialMethod as any } : c
            ));
          }
          break;

        case 'campaign.started':
        case 'campaign.paused':
          if (event.campaignId && event.status) {
            setCampaigns(prev => prev.map(c => 
              c.id === event.campaignId ? { 
                ...c, 
                status: event.status as any,
                isActive: event.type === 'campaign.started' 
              } : c
            ));
          }
          break;

        case 'agent.campaign.joined':
          if (event.campaignId) {
            setCampaigns(prev => prev.map(c => 
              c.id === event.campaignId ? { ...c, agentCount: c.agentCount + 1 } : c
            ));
          }
          break;

        case 'agent.campaign.left':
          if (event.campaignId) {
            setCampaigns(prev => prev.map(c => 
              c.id === event.campaignId ? { ...c, agentCount: Math.max(0, c.agentCount - 1) } : c
            ));
          }
          break;

        default:
          // Handle other campaign events as needed
          break;
      }
    });
  }, [campaignEvents]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsResponse, templatesResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/campaign-management/campaigns'),
        fetch('/api/admin/campaign-management/templates'),
        fetch('/api/admin/campaign-management/stats')
      ]);

      const campaignsData = await campaignsResponse.json();
      const templatesData = await templatesResponse.json();
      const statsData = await statsResponse.json();

      // Add default dial queue properties to campaigns
      const campaignsWithDialQueue = (campaignsData.data?.campaigns || []).map((campaign: ManagementCampaign) => ({
        ...campaign,
        dialMethod: campaign.dialMethod || 'MANUAL_DIAL',
        dialSpeed: campaign.dialSpeed || 60,
        isActive: campaign.isActive || false,
        agentCount: campaign.agentCount || 0,
        predictiveDialingEnabled: campaign.predictiveDialingEnabled || false,
        maxConcurrentCalls: campaign.maxConcurrentCalls || 10,
      }));

      setCampaigns(campaignsWithDialQueue);
      setTemplates(templatesData.data?.templates || []);
      setStats(statsData.data || statsData);
    } catch (err) {
      setError('Failed to fetch campaign management data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/admin/campaign-management/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateForm),
      });

      if (response.ok) {
        setIsTemplateDialogOpen(false);
        setTemplateForm({
          category: 'SALES',
          type: 'OUTBOUND',
          dialingMode: 'PROGRESSIVE',
          maxCallsPerAgent: 1,
          maxAttemptsPerRecord: 3,
          abandonRateThreshold: 0.05,
          pacingMultiplier: 1.0,
          defaultTimezone: 'UTC',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating template:', err);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch('/api/admin/campaign-management/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignForm),
      });

      if (response.ok) {
        setIsCampaignDialogOpen(false);
        setCampaignForm({
          category: 'SALES',
          type: 'OUTBOUND',
          priority: 1,
          status: 'DRAFT',
          budgetCurrency: 'USD',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-slate-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ARCHIVED: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      SALES: 'bg-green-100 text-slate-800',
      MARKETING: 'bg-blue-100 text-blue-800',
      SUPPORT: 'bg-orange-100 text-orange-800',
      SURVEYS: 'bg-purple-100 text-purple-800',
      COLLECTIONS: 'bg-red-100 text-red-800',
      NURTURE: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      OUTBOUND: <Phone className="w-4 h-4" />,
      INBOUND: <Phone className="w-4 h-4" />,
      EMAIL: <Mail className="w-4 h-4" />,
      SMS: <MessageSquare className="w-4 h-4" />,
      BLENDED: <Users className="w-4 h-4" />,
      MULTICHANNEL: <Settings className="w-4 h-4" />,
    };
    return icons[type] || <Settings className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading campaign management...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and analyze marketing and sales campaigns
          </p>
          {/* Real-time Event Status */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={connectionStatus === 'authenticated' ? 'default' : 'secondary'}>
              {connectionStatus === 'authenticated' ? '🟢 Live Events' : '🔴 Events Offline'}
            </Badge>
            {campaignEvents.length > 0 && (
              <Badge variant="outline">
                {campaignEvents.length} recent events
              </Badge>
            )}
            {systemNotifications.length > 0 && (
              <Badge variant="destructive">
                {systemNotifications.filter(n => 
                  'level' in n && (n.level === 'error' || n.level === 'critical')
                ).length} alerts
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Campaign Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template for campaigns
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={templateForm.name || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={templateForm.displayName || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, displayName: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={templateForm.description || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={templateForm.category}
                    onValueChange={(value: string) => setTemplateForm({ ...templateForm, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALES">Sales</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="SUPPORT">Support</SelectItem>
                      <SelectItem value="SURVEYS">Surveys</SelectItem>
                      <SelectItem value="COLLECTIONS">Collections</SelectItem>
                      <SelectItem value="NURTURE">Nurture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={templateForm.type}
                    onValueChange={(value: string) => setTemplateForm({ ...templateForm, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTBOUND">Outbound</SelectItem>
                      <SelectItem value="INBOUND">Inbound</SelectItem>
                      <SelectItem value="BLENDED">Blended</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="MULTICHANNEL">Multichannel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dialingMode">Dialing Mode</Label>
                  <Select
                    value={templateForm.dialingMode}
                    onValueChange={(value: string) => setTemplateForm({ ...templateForm, dialingMode: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROGRESSIVE">Progressive</SelectItem>
                      <SelectItem value="PREDICTIVE">Predictive</SelectItem>
                      <SelectItem value="PREVIEW">Preview</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxCallsPerAgent">Max Calls Per Agent</Label>
                  <Input
                    id="maxCallsPerAgent"
                    type="number"
                    min="1"
                    max="10"
                    value={templateForm.maxCallsPerAgent || 1}
                    onChange={(e) => setTemplateForm({ ...templateForm, maxCallsPerAgent: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="openingScript">Opening Script</Label>
                  <Textarea
                    id="openingScript"
                    placeholder="Hello, this is [AGENT] calling from [COMPANY]..."
                    value={templateForm.openingScript || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, openingScript: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
                <DialogDescription>
                  Create a new marketing or sales campaign
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                <div>
                  <Label htmlFor="campaignName">Name *</Label>
                  <Input
                    id="campaignName"
                    value={campaignForm.name || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="campaignDisplayName">Display Name *</Label>
                  <Input
                    id="campaignDisplayName"
                    value={campaignForm.displayName || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, displayName: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="campaignDescription">Description</Label>
                  <Textarea
                    id="campaignDescription"
                    value={campaignForm.description || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="campaignCategory">Category</Label>
                  <Select
                    value={campaignForm.category}
                    onValueChange={(value: string) => setCampaignForm({ ...campaignForm, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALES">Sales</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="SUPPORT">Support</SelectItem>
                      <SelectItem value="SURVEYS">Surveys</SelectItem>
                      <SelectItem value="COLLECTIONS">Collections</SelectItem>
                      <SelectItem value="NURTURE">Nurture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="campaignType">Type</Label>
                  <Select
                    value={campaignForm.type}
                    onValueChange={(value: string) => setCampaignForm({ ...campaignForm, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTBOUND">Outbound</SelectItem>
                      <SelectItem value="INBOUND">Inbound</SelectItem>
                      <SelectItem value="BLENDED">Blended</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="MULTICHANNEL">Multichannel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="outboundNumber">Outbound Number (CLI)</Label>
                  <Select
                    value={campaignForm.outboundNumber}
                    onValueChange={(value: string) => setCampaignForm({ ...campaignForm, outboundNumber: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select outbound number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+442046343130">+44 20 4634 3130 (UK Local)</SelectItem>
                      <SelectItem value="+15551234567">+1 555 123 4567 (US Toll-Free)</SelectItem>
                      <SelectItem value="+447700900123">+44 77 0090 0123 (UK Mobile)</SelectItem>
                      <SelectItem value="+14155552456">+1 415 555 2456 (US Local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={campaignForm.priority?.toString()}
                    onValueChange={(value: string) => setCampaignForm({ ...campaignForm, priority: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">High (1)</SelectItem>
                      <SelectItem value="2">Medium-High (2)</SelectItem>
                      <SelectItem value="3">Medium (3)</SelectItem>
                      <SelectItem value="4">Medium-Low (4)</SelectItem>
                      <SelectItem value="5">Low (5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={campaignForm.budget || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, budget: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="targetCalls">Target Calls</Label>
                  <Input
                    id="targetCalls"
                    type="number"
                    min="0"
                    value={campaignForm.targetCalls || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetCalls: parseInt(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="targetConversions">Target Conversions</Label>
                  <Input
                    id="targetConversions"
                    type="number"
                    min="0"
                    value={campaignForm.targetConversions || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetConversions: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign}>Create Campaign</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Campaign View Dialog */}
      <Dialog open={isCampaignViewDialogOpen} onOpenChange={setIsCampaignViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
            <DialogDescription>
              View campaign information and settings
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Name</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.displayName}</p>
              </div>
              <div>
                <Label>Status</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.status}</p>
              </div>
              <div>
                <Label>Type</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.type}</p>
              </div>
              <div>
                <Label>Category</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.category}</p>
              </div>
              <div>
                <Label>Dial Method</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.dialMethod}</p>
              </div>
              <div>
                <Label>Dial Speed</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.dialSpeed} CPM</p>
              </div>
              <div>
                <Label>Agent Count</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.agentCount}</p>
              </div>
              <div>
                <Label>Is Active</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.isActive ? 'Yes' : 'No'}</p>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <p className="text-sm text-gray-600">{selectedCampaign.description || 'No description'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsCampaignViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Edit Dialog */}
      <Dialog open={isCampaignEditDialogOpen} onOpenChange={setIsCampaignEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update campaign settings and configuration
            </DialogDescription>
          </DialogHeader>
          {editingCampaign && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Campaign Name</Label>
                <Input
                  id="edit-name"
                  value={editingCampaign.displayName}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, displayName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editingCampaign.status} onValueChange={(value) => setEditingCampaign({ ...editingCampaign, status: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-dial-method">Dial Method</Label>
                <Select value={editingCampaign.dialMethod} onValueChange={(value) => setEditingCampaign({ ...editingCampaign, dialMethod: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTODIAL">Auto Dial</SelectItem>
                    <SelectItem value="MANUAL_DIAL">Manual Dial</SelectItem>
                    <SelectItem value="MANUAL_PREVIEW">Manual Preview</SelectItem>
                    <SelectItem value="SKIP">Skip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-dial-speed">Dial Speed (CPM)</Label>
                <Input
                  id="edit-dial-speed"
                  type="number"
                  value={editingCampaign.dialSpeed}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, dialSpeed: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingCampaign.description || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCampaignEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Save logic would go here
              setIsCampaignEditDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Queue View Dialog */}
      <Dialog open={isQueueViewDialogOpen} onOpenChange={setIsQueueViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Outbound Queue - {selectedCampaign?.displayName}</DialogTitle>
            <DialogDescription>
              View and manage the outbound queue for this campaign
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              {/* Queue Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pending Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,247</div>
                    <div className="text-xs text-gray-500">awaiting dial</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">23</div>
                    <div className="text-xs text-gray-500">in progress</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Completed Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">486</div>
                    <div className="text-xs text-gray-500">finished calls</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">CLI Number</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-mono">{selectedCampaign.outboundNumber || '+442046343130'}</div>
                    <div className="text-xs text-gray-500">outbound number</div>
                  </CardContent>
                </Card>
              </div>

              {/* Queue Table */}
              <div className="border rounded-lg">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Queue Items</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Next Attempt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Sample queue items - replace with real data */}
                      <TableRow>
                        <TableCell>John Smith</TableCell>
                        <TableCell>+44 20 7123 4567</TableCell>
                        <TableCell>
                          <Badge variant="outline">High</Badge>
                        </TableCell>
                        <TableCell>2/3</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>14:30 Today</div>
                            <div className="text-gray-500 text-xs">in 2 hours</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Queued</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Phone className="w-3 h-3 mr-1" />
                            Call Now
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sarah Johnson</TableCell>
                        <TableCell>+44 161 234 5678</TableCell>
                        <TableCell>
                          <Badge variant="outline">Medium</Badge>
                        </TableCell>
                        <TableCell>1/3</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>15:15 Today</div>
                            <div className="text-gray-500 text-xs">in 3 hours</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Queued</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Phone className="w-3 h-3 mr-1" />
                            Call Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQueueViewDialogOpen(false)}>
              Close
            </Button>
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              Queue Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview?.totalCampaigns || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview?.totalTemplates || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview?.totalTargets || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Results</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview?.totalResults || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="events">Live Events</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Dial Method</TableHead>
                      <TableHead>CLI Number</TableHead>
                      <TableHead>Queue Controls</TableHead>
                      <TableHead>Agents</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.displayName}</div>
                            <div className="text-sm text-gray-500">{campaign.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(campaign.type)}
                            {campaign.type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(campaign.category)}>
                            {campaign.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={campaign.dialMethod || 'MANUAL_DIAL'} 
                            onValueChange={(value) => handleDialMethodChange(campaign.id, value as ManagementCampaign['dialMethod'])}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AUTODIAL">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4" />
                                  Auto Dial
                                </div>
                              </SelectItem>
                              <SelectItem value="MANUAL_DIAL">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  Manual Dial
                                </div>
                              </SelectItem>
                              <SelectItem value="MANUAL_PREVIEW">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  Manual Preview
                                </div>
                              </SelectItem>
                              <SelectItem value="SKIP">
                                <div className="flex items-center gap-2">
                                  <Pause className="w-4 h-4" />
                                  Skip
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-mono">{campaign.outboundNumber || '+442046343130'}</div>
                            <div className="text-xs text-gray-500">outbound CLI</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant={campaign.isActive ? "default" : "outline"}
                                onClick={() => handleActivateToggle(campaign.id, !campaign.isActive)}
                                className="h-6"
                              >
                                <Power className="w-3 h-3 mr-1" />
                                {campaign.isActive ? 'Active' : 'Inactive'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedCampaign(campaign);
                                  setIsQueueViewDialogOpen(true);
                                }}
                                className="h-6"
                                title="View Outbound Queue"
                              >
                                <Target className="w-3 h-3 mr-1" />
                                Queue
                              </Button>
                            </div>
                            {campaign.dialMethod === 'AUTODIAL' && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <Input
                                  type="number"
                                  value={campaign.dialSpeed || 60}
                                  onChange={(e) => handleDialSpeedChange(campaign.id, parseInt(e.target.value) || 60)}
                                  className="w-12 h-6 text-xs"
                                  min="1"
                                  max="300"
                                />
                                <span className="text-xs text-gray-500">cpm</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              <span className="text-sm font-medium">{campaign.agentCount || 0}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleAgentJoin(campaign.id)}
                                className="h-6 w-6 p-0"
                              >
                                <UserPlus className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleAgentLeave(campaign.id)}
                                disabled={!campaign.agentCount || campaign.agentCount === 0}
                                className="h-6 w-6 p-0"
                              >
                                <UserMinus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setIsCampaignViewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setEditingCampaign(campaign);
                                setIsCampaignEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleActivateToggle(campaign.id, !campaign.isActive)}
                            >
                              {campaign.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No campaigns found. Create your first campaign to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Dialing Mode</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.displayName}</div>
                            <div className="text-sm text-gray-500">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-gray-400 mt-1 max-w-xs truncate">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(template.type)}
                            {template.type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{template.usageCount} campaigns</div>
                            <div className="text-gray-500">
                              {template._count?.campaigns || 0} active
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {template.dialingMode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No templates found. Create your first template to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Campaigns by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats?.breakdown?.byStatus || {}).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center">
                          <Badge className={getStatusColor(status)}>
                            {status}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Campaigns by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats?.breakdown?.byCategory || {}).map(([category, count]) => (
                        <div key={category} className="flex justify-between items-center">
                          <Badge className={getCategoryColor(category)}>
                            {category}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {stats && stats?.topPerformingCampaigns?.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Top Performing Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Calls</TableHead>
                        <TableHead>Connections</TableHead>
                        <TableHead>Conversions</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.topPerformingCampaigns?.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">
                            {campaign.displayName}
                          </TableCell>
                          <TableCell>{campaign.totalCalls}</TableCell>
                          <TableCell>{campaign.totalConnections}</TableCell>
                          <TableCell className="text-slate-600">
                            {campaign.totalConversions}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">
                            ${campaign.totalRevenue?.toFixed(2) || '0.00'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Real-time Event System
                  <Badge variant={connectionStatus === 'authenticated' ? 'default' : 'secondary'}>
                    {connectionStatus}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Live updates for campaign changes, agent activities, and system events
                </p>
                {connectionStatus !== 'authenticated' && (
                  <Alert>
                    <AlertDescription>
                      Event system is not connected. Some features may not update in real-time.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Recent Campaign Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Campaign Events</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignEvents.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {campaignEvents.slice(0, 10).map((event, index) => (
                      <div key={`${event.id}-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.type}</Badge>
                          {'campaignId' in event && event.campaignId && (
                            <span className="text-sm">{event.campaignId}</span>
                          )}
                          {'campaignName' in event && event.campaignName && (
                            <span className="text-sm text-muted-foreground">
                              - {event.campaignName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent campaign events
                  </p>
                )}
              </CardContent>
            </Card>

            {/* System Notifications */}
            {systemNotifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>System Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {systemNotifications.slice(0, 5).map((notification, index) => (
                      <Alert 
                        key={`${notification.id}-${index}`}
                        variant={'level' in notification && notification.level === 'error' ? 'destructive' : 'default'}
                      >
                        <AlertDescription className="flex items-center justify-between">
                          <span>{'message' in notification ? notification.message : 'System notification'}</span>
                          <span className="text-xs">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </span>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{campaignEvents.length}</div>
                    <p className="text-sm text-muted-foreground">Campaign Events</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{systemNotifications.length}</div>
                    <p className="text-sm text-muted-foreground">System Events</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {campaignEvents.filter(e => e.type.includes('agent')).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Agent Events</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {campaignEvents.filter(e => 
                        e.timestamp && new Date(e.timestamp).getTime() > Date.now() - 60000
                      ).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Last Minute</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignManagementPage;