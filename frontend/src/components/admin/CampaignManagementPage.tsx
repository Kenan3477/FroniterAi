import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Settings
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

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
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
  });

  useEffect(() => {
    fetchData();
  }, []);

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

      setCampaigns(campaignsData.data || []);
      setTemplates(templatesData.data || []);
      setStats(statsData);
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
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ARCHIVED: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      SALES: 'bg-green-100 text-green-800',
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalCampaigns}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalTemplates}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalTargets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Results</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalResults}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                      <TableHead>Progress</TableHead>
                      <TableHead>Performance</TableHead>
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
                          <div className="text-sm">
                            <div>{campaign.totalTargets} targets</div>
                            <div className="text-gray-500">
                              {campaign.totalCalls} calls
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-green-600">
                              {campaign.totalConversions} conversions
                            </div>
                            <div className="text-gray-500">
                              ${campaign.totalRevenue.toFixed(2)}
                            </div>
                          </div>
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
                              {campaign.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
                      {Object.entries(stats.breakdown.byStatus).map(([status, count]) => (
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
                      {Object.entries(stats.breakdown.byCategory).map(([category, count]) => (
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

            {stats && stats.topPerformingCampaigns.length > 0 && (
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
                      {stats.topPerformingCampaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">
                            {campaign.displayName}
                          </TableCell>
                          <TableCell>{campaign.totalCalls}</TableCell>
                          <TableCell>{campaign.totalConnections}</TableCell>
                          <TableCell className="text-green-600">
                            {campaign.totalConversions}
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            ${campaign.totalRevenue.toFixed(2)}
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
      </Tabs>
    </div>
  );
};

export default CampaignManagementPage;