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
import { Plus, Edit, Trash2, Building, Settings, Users, BarChart } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  _count?: {
    businessSettings: number;
    companyProfiles: number;
    operationalParams: number;
    businessRules: number;
  };
}

interface BusinessSetting {
  id: string;
  organizationId: string;
  category: 'GENERAL' | 'SECURITY' | 'NOTIFICATIONS' | 'INTEGRATIONS' | 'BILLING' | 'COMPLIANCE';
  settingKey: string;
  settingValue: string;
  settingType: 'string' | 'number' | 'boolean' | 'json' | 'encrypted';
  description?: string;
  isEditable: boolean;
  isVisible: boolean;
  sortOrder?: number;
  validationRules?: string;
  allowedValues?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CompanyProfile {
  id: string;
  organizationId: string;
  legalName: string;
  tradingName?: string;
  registrationNumber?: string;
  taxId?: string;
  vatNumber?: string;
  industry?: string;
  subIndustry?: string;
  companySize?: 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  annualRevenue?: string;
  mainEmail: string;
  supportEmail?: string;
  salesEmail?: string;
  mainPhone?: string;
  supportPhone?: string;
  faxNumber?: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  billingPostal: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingCountry?: string;
  shippingPostal?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  certifications?: string;
  regulations?: string;
}

interface BusinessSettingsStats {
  organizations: {
    total: number;
  };
  settings: {
    total: number;
    byCategory: Record<string, number>;
  };
  profiles: {
    total: number;
  };
  parameters: {
    total: number;
    byCategory: Record<string, number>;
  };
  rules: {
    total: number;
    byCategory: Record<string, number>;
  };
}

const BusinessSettingsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSetting[]>([]);
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [stats, setStats] = useState<BusinessSettingsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isOrganizationDialogOpen, setIsOrganizationDialogOpen] = useState(false);
  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [organizationForm, setOrganizationForm] = useState<Partial<Organization>>({
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12'
  });
  
  const [settingForm, setSettingForm] = useState<Partial<BusinessSetting>>({
    category: 'GENERAL',
    settingType: 'string',
    isEditable: true,
    isVisible: true
  });
  
  const [profileForm, setProfileForm] = useState<Partial<CompanyProfile>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/business-settings/organizations'),
        fetch('/api/admin/business-settings/stats')
      ]);

      const orgsData = await orgsResponse.json();
      const statsData = await statsResponse.json();

      setOrganizations(orgsData.data || []);
      setStats(statsData);
    } catch (err) {
      setError('Failed to fetch business settings data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationDetails = async (organizationId: string) => {
    try {
      const [settingsResponse, profilesResponse] = await Promise.all([
        fetch(`/api/admin/business-settings/organizations/${organizationId}/settings`),
        fetch(`/api/admin/business-settings/organizations/${organizationId}/profiles`)
      ]);

      const settingsData = await settingsResponse.json();
      const profilesData = await profilesResponse.json();

      setBusinessSettings(settingsData.data || []);
      setCompanyProfiles(profilesData.data || []);
    } catch (err) {
      console.error('Error fetching organization details:', err);
    }
  };

  const handleOrganizationSelect = (organization: Organization) => {
    setSelectedOrganization(organization);
    fetchOrganizationDetails(organization.id);
  };

  const handleCreateOrganization = async () => {
    try {
      const response = await fetch('/api/admin/business-settings/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(organizationForm),
      });

      if (response.ok) {
        setIsOrganizationDialogOpen(false);
        setOrganizationForm({
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'MM/dd/yyyy',
          timeFormat: '12'
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating organization:', err);
    }
  };

  const handleCreateSetting = async () => {
    if (!selectedOrganization) return;

    try {
      const response = await fetch('/api/admin/business-settings/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settingForm,
          organizationId: selectedOrganization.id
        }),
      });

      if (response.ok) {
        setIsSettingDialogOpen(false);
        setSettingForm({
          category: 'GENERAL',
          settingType: 'string',
          isEditable: true,
          isVisible: true
        });
        fetchOrganizationDetails(selectedOrganization.id);
      }
    } catch (err) {
      console.error('Error creating setting:', err);
    }
  };

  const handleCreateProfile = async () => {
    if (!selectedOrganization) return;

    try {
      const response = await fetch('/api/admin/business-settings/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileForm,
          organizationId: selectedOrganization.id
        }),
      });

      if (response.ok) {
        setIsProfileDialogOpen(false);
        setProfileForm({});
        fetchOrganizationDetails(selectedOrganization.id);
      }
    } catch (err) {
      console.error('Error creating profile:', err);
    }
  };

  const formatSettingValue = (setting: BusinessSetting) => {
    switch (setting.settingType) {
      case 'boolean':
        return setting.settingValue === 'true' ? 'Yes' : 'No';
      case 'json':
        try {
          return JSON.stringify(JSON.parse(setting.settingValue), null, 2);
        } catch {
          return setting.settingValue;
        }
      case 'encrypted':
        return '••••••••';
      default:
        return setting.settingValue;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      GENERAL: 'bg-blue-100 text-blue-800',
      SECURITY: 'bg-red-100 text-red-800',
      NOTIFICATIONS: 'bg-yellow-100 text-yellow-800',
      INTEGRATIONS: 'bg-green-100 text-green-800',
      BILLING: 'bg-purple-100 text-purple-800',
      COMPLIANCE: 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading business settings...</div>
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
          <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
          <p className="text-muted-foreground">
            Manage organization settings, configurations, and profiles
          </p>
        </div>
        <Dialog open={isOrganizationDialogOpen} onOpenChange={setIsOrganizationDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Add a new organization to manage business settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={organizationForm.name || ''}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={organizationForm.displayName || ''}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, displayName: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={organizationForm.description || ''}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={organizationForm.email || ''}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={organizationForm.phone || ''}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={organizationForm.website || ''}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, website: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={organizationForm.timezone}
                  onValueChange={(value: string) => setOrganizationForm({ ...organizationForm, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={organizationForm.currency}
                  onValueChange={(value: string) => setOrganizationForm({ ...organizationForm, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={organizationForm.primaryColor || '#000000'}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, primaryColor: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrganizationDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrganization}>Create Organization</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.organizations.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.settings.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profiles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.profiles.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Parameters</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.parameters.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rules</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rules.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedOrganization?.id === org.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleOrganizationSelect(org)}
                >
                  <div className="font-medium">{org.displayName}</div>
                  <div className="text-sm text-gray-500">{org.name}</div>
                  {org._count && (
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {org._count.businessSettings} settings
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {org._count.companyProfiles} profiles
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Organization Details */}
        <div className="lg:col-span-2">
          {selectedOrganization ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedOrganization.displayName}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="settings">
                  <TabsList>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="profiles">Profiles</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="settings" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Business Settings</h3>
                      <Dialog open={isSettingDialogOpen} onOpenChange={setIsSettingDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Setting
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Business Setting</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="category">Category</Label>
                              <Select
                                value={settingForm.category}
                                onValueChange={(value: string) => setSettingForm({ ...settingForm, category: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="GENERAL">General</SelectItem>
                                  <SelectItem value="SECURITY">Security</SelectItem>
                                  <SelectItem value="NOTIFICATIONS">Notifications</SelectItem>
                                  <SelectItem value="INTEGRATIONS">Integrations</SelectItem>
                                  <SelectItem value="BILLING">Billing</SelectItem>
                                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="settingKey">Setting Key</Label>
                              <Input
                                id="settingKey"
                                value={settingForm.settingKey || ''}
                                onChange={(e) => setSettingForm({ ...settingForm, settingKey: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="settingValue">Setting Value</Label>
                              <Input
                                id="settingValue"
                                value={settingForm.settingValue || ''}
                                onChange={(e) => setSettingForm({ ...settingForm, settingValue: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="settingType">Type</Label>
                              <Select
                                value={settingForm.settingType}
                                onValueChange={(value: string) => setSettingForm({ ...settingForm, settingType: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="json">JSON</SelectItem>
                                  <SelectItem value="encrypted">Encrypted</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={settingForm.description || ''}
                                onChange={(e) => setSettingForm({ ...settingForm, description: e.target.value })}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSettingDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateSetting}>Add Setting</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {businessSettings.map((setting) => (
                          <TableRow key={setting.id}>
                            <TableCell>
                              <Badge className={getCategoryColor(setting.category)}>
                                {setting.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{setting.settingKey}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {formatSettingValue(setting)}
                            </TableCell>
                            <TableCell>{setting.settingType}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
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
                  </TabsContent>

                  <TabsContent value="profiles" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Company Profiles</h3>
                      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Add Company Profile</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                            <div>
                              <Label htmlFor="legalName">Legal Name *</Label>
                              <Input
                                id="legalName"
                                value={profileForm.legalName || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, legalName: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="tradingName">Trading Name</Label>
                              <Input
                                id="tradingName"
                                value={profileForm.tradingName || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, tradingName: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="mainEmail">Main Email *</Label>
                              <Input
                                id="mainEmail"
                                type="email"
                                value={profileForm.mainEmail || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, mainEmail: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="mainPhone">Main Phone</Label>
                              <Input
                                id="mainPhone"
                                value={profileForm.mainPhone || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, mainPhone: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label htmlFor="billingAddress">Billing Address *</Label>
                              <Input
                                id="billingAddress"
                                value={profileForm.billingAddress || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, billingAddress: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="billingCity">Billing City *</Label>
                              <Input
                                id="billingCity"
                                value={profileForm.billingCity || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, billingCity: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="billingState">Billing State *</Label>
                              <Input
                                id="billingState"
                                value={profileForm.billingState || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, billingState: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="billingCountry">Billing Country *</Label>
                              <Input
                                id="billingCountry"
                                value={profileForm.billingCountry || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, billingCountry: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="billingPostal">Billing Postal *</Label>
                              <Input
                                id="billingPostal"
                                value={profileForm.billingPostal || ''}
                                onChange={(e) => setProfileForm({ ...profileForm, billingPostal: e.target.value })}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateProfile}>Add Profile</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {companyProfiles.length > 0 ? (
                      <div className="space-y-4">
                        {companyProfiles.map((profile) => (
                          <Card key={profile.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">{profile.legalName}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Trading Name:</strong> {profile.tradingName || 'N/A'}
                                </div>
                                <div>
                                  <strong>Main Email:</strong> {profile.mainEmail}
                                </div>
                                <div>
                                  <strong>Main Phone:</strong> {profile.mainPhone || 'N/A'}
                                </div>
                                <div>
                                  <strong>Industry:</strong> {profile.industry || 'N/A'}
                                </div>
                                <div className="col-span-2">
                                  <strong>Billing Address:</strong> {profile.billingAddress}, {profile.billingCity}, {profile.billingState} {profile.billingPostal}, {profile.billingCountry}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        No company profiles found
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <div className="text-lg font-medium text-gray-900">Select an organization</div>
                  <div className="text-gray-500">Choose an organization to view its settings and profiles</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessSettingsPage;