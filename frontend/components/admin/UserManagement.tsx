'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Ban, 
  CheckCircle,
  XCircle,
  Crown,
  Calendar,
  Mail,
  Phone,
  Building,
  CreditCard,
  Activity,
  Download,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  company?: string
  subscriptionTier: 'free' | 'professional' | 'enterprise'
  status: 'active' | 'inactive' | 'suspended'
  joinedAt: string
  lastActive: string
  totalAnalyses: number
  totalSpent: number
  phone?: string
  country?: string
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    avatar: '',
    company: 'Tech Corp',
    subscriptionTier: 'enterprise',
    status: 'active',
    joinedAt: '2024-01-15',
    lastActive: '2024-01-20',
    totalAnalyses: 45,
    totalSpent: 2499.99,
    phone: '+1 555-0123',
    country: 'United States'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@startup.co',
    company: 'Startup Inc',
    subscriptionTier: 'professional',
    status: 'active',
    joinedAt: '2024-01-10',
    lastActive: '2024-01-19',
    totalAnalyses: 23,
    totalSpent: 799.99,
    phone: '+1 555-0456',
    country: 'Canada'
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike@freelance.com',
    subscriptionTier: 'free',
    status: 'inactive',
    joinedAt: '2024-01-05',
    lastActive: '2024-01-18',
    totalAnalyses: 8,
    totalSpent: 0,
    country: 'Australia'
  }
]

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { toast } = useToast()

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    const matchesTier = filterTier === 'all' || user.subscriptionTier === filterTier

    return matchesSearch && matchesStatus && matchesTier
  })

  const handleUserAction = (userId: string, action: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    switch (action) {
      case 'suspend':
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, status: 'suspended' as const } : u
        ))
        toast({
          title: 'User suspended',
          description: `${user.name} has been suspended.`,
          variant: 'destructive'
        })
        break
      case 'activate':
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, status: 'active' as const } : u
        ))
        toast({
          title: 'User activated',
          description: `${user.name} has been activated.`
        })
        break
      case 'edit':
        setSelectedUser(user)
        break
      case 'contact':
        toast({
          title: 'Contact user',
          description: `Opening email client for ${user.email}`
        })
        break
    }
  }

  const getStatusIcon = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />
      case 'suspended':
        return <Ban className="w-4 h-4 text-red-500" />
    }
  }

  const getTierIcon = (tier: User['subscriptionTier']) => {
    switch (tier) {
      case 'enterprise':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'professional':
        return <Crown className="w-4 h-4 text-blue-500" />
      case 'free':
        return <Users className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage and monitor user accounts</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enterprise</p>
                <p className="text-2xl font-bold">{users.filter(u => u.subscriptionTier === 'enterprise').length}</p>
              </div>
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">${users.reduce((sum, u) => sum + u.totalSpent, 0).toLocaleString()}</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and monitor activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{user.name}</h3>
                      {getStatusIcon(user.status)}
                      {getTierIcon(user.subscriptionTier)}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.company && (
                      <p className="text-xs text-muted-foreground">{user.company}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right text-sm">
                    <p className="font-medium">{user.totalAnalyses} analyses</p>
                    <p className="text-muted-foreground">${user.totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Joined</p>
                    <p className="font-medium">{new Date(user.joinedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Last Active</p>
                    <p className="font-medium">{new Date(user.lastActive).toLocaleDateString()}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUserAction(user.id, 'edit')}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUserAction(user.id, 'contact')}>
                        <Mail className="w-4 h-4 mr-2" />
                        Contact
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.status === 'active' ? (
                        <DropdownMenuItem 
                          onClick={() => handleUserAction(user.id, 'suspend')}
                          className="text-red-600"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleUserAction(user.id, 'activate')}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Activate User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal would go here if selectedUser */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={(updatedUser) => {
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
            setSelectedUser(null)
            toast({
              title: 'User updated',
              description: `${updatedUser.name}'s profile has been updated.`
            })
          }}
        />
      )}
    </div>
  )
}

function UserDetailsModal({ 
  user, 
  onClose, 
  onSave 
}: {
  user: User
  onClose: () => void
  onSave: (user: User) => void
}) {
  const [editedUser, setEditedUser] = useState(user)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>Edit user information and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    value={editedUser.name}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    value={editedUser.email}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Company</label>
                  <Input 
                    value={editedUser.company || ''}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input 
                    value={editedUser.phone || ''}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="subscription">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subscription Tier</label>
                  <Select 
                    value={editedUser.subscriptionTier}
                    onValueChange={(value) => setEditedUser(prev => ({ 
                      ...prev, 
                      subscriptionTier: value as User['subscriptionTier']
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total Analyses</label>
                    <Input 
                      type="number"
                      value={editedUser.totalAnalyses}
                      onChange={(e) => setEditedUser(prev => ({ 
                        ...prev, 
                        totalAnalyses: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Spent</label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editedUser.totalSpent}
                      onChange={(e) => setEditedUser(prev => ({ 
                        ...prev, 
                        totalSpent: parseFloat(e.target.value) 
                      }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="activity">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={editedUser.status}
                      onValueChange={(value) => setEditedUser(prev => ({ 
                        ...prev, 
                        status: value as User['status']
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input 
                      value={editedUser.country || ''}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Joined Date</label>
                    <Input 
                      type="date"
                      value={editedUser.joinedAt}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, joinedAt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Active</label>
                    <Input 
                      type="date"
                      value={editedUser.lastActive}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, lastActive: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(editedUser)}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
