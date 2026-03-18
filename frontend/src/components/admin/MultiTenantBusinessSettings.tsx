import React, { useState, useEffect } from 'react';
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
  Building, 
  Users, 
  Database, 
  Phone, 
  Settings, 
  Plus, 
  Search, 
  Edit3,
  Trash2,
  Shield,
  Activity,
  BarChart3,
  UserPlus,
  Building2
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  industry?: string;
  type?: string;
  status?: string;
  userCount: number;
  contactCount: number;
  campaignCount: number;
  createdAt: string;
  lastActivity?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  organizationName?: string;
}

interface CrossOrgStats {
  totalOrganizations: number;
  totalUsers: number;
  totalContacts: number;
  totalCampaigns: number;
  totalCallRecords: number;
  organizationBreakdown: {
    id: string;
    name: string;
    userCount: number;
    contactCount: number;
    campaignCount: number;
  }[];
}

interface OrganizationPermissions {
  canCreateUsers: boolean;
  canCreateOrganizations: boolean;
  canMakeCalls: boolean;
  canDeleteData: boolean;
  canDeleteCampaigns: boolean;
  canAccessOtherOrgData: boolean;
  dataAccessOrganizations: string[];
}

export default function MultiTenantBusinessSettings() {
  // State management
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [crossOrgStats, setCrossOrgStats] = useState<CrossOrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [isNewOrgDialogOpen, setIsNewOrgDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  // Form states
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    displayName: '',
    description: '',
    email: '',
    industry: '',
    size: ''
  });

  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'AGENT' as 'SUPER_ADMIN' | 'ADMIN' | 'AGENT' | 'VIEWER'
  });

  const [permissions, setPermissions] = useState<OrganizationPermissions>({
    canCreateUsers: false,
    canCreateOrganizations: false,
    canMakeCalls: true,
    canDeleteData: false,
    canDeleteCampaigns: false,
    canAccessOtherOrgData: false,
    dataAccessOrganizations: []
  });

  // API helper functions
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load organization users when selection changes
  useEffect(() => {
    if (selectedOrg) {
      loadOrganizationUsers(selectedOrg.id);
    }
  }, [selectedOrg]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [orgsResponse, dashboardResponse] = await Promise.all([
        fetch('/api/admin/business-settings/organizations', { 
          headers: getAuthHeaders() 
        }),
        fetch('/api/admin/business-settings/dashboard', { 
          headers: getAuthHeaders() 
        })
      ]);

      if (orgsResponse.ok && dashboardResponse.ok) {
        const orgsData = await orgsResponse.json();
        const dashboardData = await dashboardResponse.json();

        const orgsArray = Array.isArray(orgsData?.data) 
          ? orgsData.data 
          : Array.isArray(orgsData?.data?.organizations) 
            ? orgsData.data.organizations 
            : [];

        // Enhance organizations with stats from dashboard
        const enhancedOrgs = orgsArray.map((org: any) => {
          const breakdown = dashboardData.data.organizationBreakdown.find((b: any) => b.id === org.id);
          return {
            ...org,
            userCount: breakdown?.userCount || 0,
            contactCount: breakdown?.contactCount || 0,
            campaignCount: breakdown?.campaignCount || 0
          };
        });

        setOrganizations(enhancedOrgs);
        setCrossOrgStats(dashboardData.data);
        
        // Auto-select first organization
        if (enhancedOrgs.length > 0) {
          setSelectedOrg(enhancedOrgs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationUsers = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/admin/business-settings/organizations/${organizationId}/users`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setOrgUsers(data.data.users || []);
      }
    } catch (error) {
      console.error('Failed to load organization users:', error);
    }
  };

  const handleCreateOrganization = async () => {
    try {
      const response = await fetch('/api/admin/business-settings/organizations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newOrgForm)
      });

      if (response.ok) {
        setIsNewOrgDialogOpen(false);
        setNewOrgForm({
          name: '',
          displayName: '',
          description: '',
          email: '',
          industry: '',
          size: ''
        });
        loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!selectedOrg) return;

    try {
      const response = await fetch(`/api/admin/business-settings/organizations/${selectedOrg.id}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUserForm)
      });

      if (response.ok) {
        setIsNewUserDialogOpen(false);
        setNewUserForm({
          firstName: '',
          lastName: '',
          email: '',
          role: 'AGENT'
        });
        loadOrganizationUsers(selectedOrg.id);
        loadDashboardData(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedOrg) return;

    try {
      const response = await fetch(`/api/admin/business-settings/organizations/${selectedOrg.id}/permissions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(permissions)
      });

      if (response.ok) {
        setIsPermissionsDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.industry && org.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading business settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Settings</h1>
          <p className="text-muted-foreground mt-1">Manage organizations, users, and permissions across your platform</p>
        </div>
        <Button onClick={() => setIsNewOrgDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Organization
        </Button>
      </div>

      {/* Global Statistics */}
      {crossOrgStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organizations</p>
                  <p className="text-2xl font-bold text-foreground">{crossOrgStats.totalOrganizations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{crossOrgStats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contacts</p>
                  <p className="text-2xl font-bold text-foreground">{crossOrgStats.totalContacts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Campaigns</p>
                  <p className="text-2xl font-bold text-foreground">{crossOrgStats.totalCampaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <Phone className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Call Records</p>
                  <p className="text-2xl font-bold text-foreground">{crossOrgStats.totalCallRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Organizations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Organizations</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredOrganizations.map((org) => (
              <div
                key={org.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                  selectedOrg?.id === org.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setSelectedOrg(org)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground truncate">{org.displayName}</h4>
                  <Badge variant={org.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                    {org.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{org.name}</p>
                <div className="flex gap-1 text-xs text-muted-foreground">
                  <span>{org.userCount} users</span>
                  <span>•</span>
                  <span>{org.contactCount} contacts</span>
                </div>
                {org.industry && (
                  <p className="text-xs text-muted-foreground mt-1">{org.industry}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Center Panel - Organization Details and Users */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">
                {selectedOrg ? `${selectedOrg.displayName} - Users` : 'Select Organization'}
              </CardTitle>
              {selectedOrg && (
                <Button 
                  size="sm" 
                  onClick={() => setIsNewUserDialogOpen(true)}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedOrg ? (
              <>
                {/* Organization Info */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Industry:</span>
                      <span className="ml-2 text-foreground">{selectedOrg.industry || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 text-foreground">{selectedOrg.type || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Users:</span>
                      <span className="ml-2 text-foreground">{selectedOrg.userCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Campaigns:</span>
                      <span className="ml-2 text-foreground">{selectedOrg.campaignCount}</span>
                    </div>
                  </div>
                  {selectedOrg.description && (
                    <p className="text-sm text-muted-foreground mt-3">{selectedOrg.description}</p>
                  )}
                </div>

                {/* Users Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-foreground">Name</TableHead>
                        <TableHead className="text-foreground">Email</TableHead>
                        <TableHead className="text-foreground">Role</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                          <TableCell className="text-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Building className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">Select an organization</h3>
                <p className="text-muted-foreground">Choose an organization from the list to view its details and manage users</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Permissions and Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Organization Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedOrg ? (
              <>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setIsPermissionsDialogOpen(true)}
                >
                  <Shield className="w-4 h-4" />
                  Manage Permissions
                </Button>

                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="w-4 h-4" />
                  Organization Settings
                </Button>

                <Button variant="outline" className="w-full justify-start gap-2">
                  <Activity className="w-4 h-4" />
                  View Activity Log
                </Button>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-foreground mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      Export User List
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      Generate Report
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full text-left justify-start"
                    >
                      Delete Organization
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">Select an organization to view controls</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={isNewOrgDialogOpen} onOpenChange={setIsNewOrgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a new organization with its own isolated data and users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={newOrgForm.name}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                placeholder="acme-corp"
              />
            </div>
            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={newOrgForm.displayName}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, displayName: e.target.value })}
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <Label htmlFor="email">Admin Email *</Label>
              <Input
                id="email"
                type="email"
                value={newOrgForm.email}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, email: e.target.value })}
                placeholder="admin@acme.com"
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select value={newOrgForm.industry} onValueChange={(value) => setNewOrgForm({ ...newOrgForm, industry: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newOrgForm.description}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, description: e.target.value })}
                placeholder="Brief description of the organization..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrgDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization}>
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account in {selectedOrg?.displayName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={newUserForm.firstName}
                onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={newUserForm.lastName}
                onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Permissions</DialogTitle>
            <DialogDescription>
              Configure what users in {selectedOrg?.displayName} are allowed to do.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Create Users</Label>
                <p className="text-xs text-muted-foreground">Allow users to create new user accounts</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.canCreateUsers}
                onChange={(e) => setPermissions({ ...permissions, canCreateUsers: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Create Organizations</Label>
                <p className="text-xs text-muted-foreground">Allow users to create new organizations</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.canCreateOrganizations}
                onChange={(e) => setPermissions({ ...permissions, canCreateOrganizations: e.target.checked })}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Make Calls</Label>
                <p className="text-xs text-muted-foreground">Allow users to make calls and access dialer</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.canMakeCalls}
                onChange={(e) => setPermissions({ ...permissions, canMakeCalls: e.target.checked })}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Delete Data</Label>
                <p className="text-xs text-muted-foreground">Allow users to delete contacts, campaigns, etc.</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.canDeleteData}
                onChange={(e) => setPermissions({ ...permissions, canDeleteData: e.target.checked })}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Access Other Organization Data</Label>
                <p className="text-xs text-muted-foreground">Allow cross-organization data access</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.canAccessOtherOrgData}
                onChange={(e) => setPermissions({ ...permissions, canAccessOtherOrgData: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions}>
              Update Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}