'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageCircle, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar,
  MoreVertical,
  Reply,
  Archive,
  Flag,
  Star,
  Plus,
  Paperclip,
  Send,
  X
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

interface SupportTicket {
  id: string
  subject: string
  message: string
  customer: {
    id: string
    name: string
    email: string
    avatar?: string
    tier: 'free' | 'professional' | 'enterprise'
  }
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'technical' | 'billing' | 'feature-request' | 'general'
  assignedTo?: string
  createdAt: string
  updatedAt: string
  replies: TicketReply[]
  tags: string[]
}

interface TicketReply {
  id: string
  message: string
  author: {
    name: string
    type: 'customer' | 'support'
  }
  createdAt: string
  attachments?: string[]
}

const mockTickets: SupportTicket[] = [
  {
    id: '1',
    subject: 'Unable to upload financial statements',
    message: 'I\'m having trouble uploading my PDF financial statements. The system shows an error message.',
    customer: {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@example.com',
      tier: 'enterprise'
    },
    status: 'open',
    priority: 'high',
    category: 'technical',
    assignedTo: 'Sarah (Support)',
    createdAt: '2024-01-20T10:30:00Z',
    updatedAt: '2024-01-20T10:30:00Z',
    replies: [],
    tags: ['file-upload', 'pdf']
  },
  {
    id: '2',
    subject: 'Billing question about enterprise plan',
    message: 'I need clarification on the billing cycle for the enterprise plan and available payment methods.',
    customer: {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@startup.co',
      tier: 'professional'
    },
    status: 'in-progress',
    priority: 'medium',
    category: 'billing',
    assignedTo: 'Mike (Support)',
    createdAt: '2024-01-19T14:15:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
    replies: [
      {
        id: '1',
        message: 'Thank you for reaching out! I\'d be happy to help clarify our enterprise billing.',
        author: {
          name: 'Mike',
          type: 'support'
        },
        createdAt: '2024-01-19T15:00:00Z'
      }
    ],
    tags: ['billing', 'enterprise']
  },
  {
    id: '3',
    subject: 'Feature request: Export to Excel',
    message: 'Would it be possible to add Excel export functionality for analysis reports?',
    customer: {
      id: '3',
      name: 'Mike Chen',
      email: 'mike@freelance.com',
      tier: 'free'
    },
    status: 'resolved',
    priority: 'low',
    category: 'feature-request',
    createdAt: '2024-01-18T11:20:00Z',
    updatedAt: '2024-01-19T16:30:00Z',
    replies: [
      {
        id: '2',
        message: 'Great suggestion! We\'ve added this to our roadmap for Q2 2024.',
        author: {
          name: 'Support Team',
          type: 'support'
        },
        createdAt: '2024-01-19T16:30:00Z'
      }
    ],
    tags: ['feature-request', 'export']
  }
]

export function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [replyMessage, setReplyMessage] = useState('')
  const { toast } = useToast()

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority
    const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  const handleTicketAction = (ticketId: string, action: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket) return

    switch (action) {
      case 'assign':
        toast({
          title: 'Assign ticket',
          description: 'Ticket assignment feature coming soon!'
        })
        break
      case 'close':
        setTickets(prev => prev.map(t => 
          t.id === ticketId ? { ...t, status: 'closed' as const, updatedAt: new Date().toISOString() } : t
        ))
        toast({
          title: 'Ticket closed',
          description: `Ticket #${ticketId} has been closed.`
        })
        break
      case 'resolve':
        setTickets(prev => prev.map(t => 
          t.id === ticketId ? { ...t, status: 'resolved' as const, updatedAt: new Date().toISOString() } : t
        ))
        toast({
          title: 'Ticket resolved',
          description: `Ticket #${ticketId} has been marked as resolved.`
        })
        break
    }
  }

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return

    const newReply: TicketReply = {
      id: Date.now().toString(),
      message: replyMessage,
      author: {
        name: 'Support Agent',
        type: 'support'
      },
      createdAt: new Date().toISOString()
    }

    setTickets(prev => prev.map(t => 
      t.id === selectedTicket.id 
        ? { 
            ...t, 
            replies: [...t.replies, newReply],
            status: 'in-progress' as const,
            updatedAt: new Date().toISOString()
          } 
        : t
    ))

    setSelectedTicket(prev => prev ? {
      ...prev,
      replies: [...prev.replies, newReply],
      status: 'in-progress' as const,
      updatedAt: new Date().toISOString()
    } : null)

    setReplyMessage('')
    toast({
      title: 'Reply sent',
      description: 'Your response has been sent to the customer.'
    })
  }

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700'
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-700'
      case 'resolved':
        return 'bg-green-100 text-green-700'
      case 'closed':
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return '👑'
      case 'professional':
        return '⭐'
      case 'free':
        return '🆓'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'open').length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'in-progress').length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'resolved').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">2.4h</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="feature-request">Feature Request</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets */}
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTicket?.id === ticket.id ? 'border-primary-300 bg-primary-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{ticket.subject}</h3>
                        <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{ticket.category}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleTicketAction(ticket.id, 'assign')}>
                          <User className="w-4 h-4 mr-2" />
                          Assign
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTicketAction(ticket.id, 'resolve')}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Resolved
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleTicketAction(ticket.id, 'close')}>
                          <Archive className="w-4 h-4 mr-2" />
                          Close Ticket
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{getTierIcon(ticket.customer.tier)}</span>
                      <span>{ticket.customer.name}</span>
                      {ticket.assignedTo && <span>• Assigned to {ticket.assignedTo}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Ticket Details */}
        <div>
          {selectedTicket ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                    <CardDescription>
                      Ticket #{selectedTicket.id} • {selectedTicket.customer.name}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {selectedTicket.status}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(selectedTicket.priority)}>
                    {selectedTicket.priority}
                  </Badge>
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar>
                    <AvatarImage src={selectedTicket.customer.avatar} />
                    <AvatarFallback>
                      {selectedTicket.customer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedTicket.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTicket.customer.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {getTierIcon(selectedTicket.customer.tier)} {selectedTicket.customer.tier} plan
                    </p>
                  </div>
                </div>

                {/* Original Message */}
                <div className="space-y-2">
                  <h4 className="font-medium">Original Message</h4>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">{selectedTicket.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Replies */}
                {selectedTicket.replies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Conversation</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedTicket.replies.map((reply) => (
                        <div 
                          key={reply.id}
                          className={`p-3 rounded-lg ${
                            reply.author.type === 'support' 
                              ? 'bg-green-50 ml-4' 
                              : 'bg-blue-50 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{reply.author.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                <div className="space-y-3">
                  <h4 className="font-medium">Reply</h4>
                  <Textarea
                    placeholder="Type your response..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attach File
                    </Button>
                    <Button onClick={handleSendReply} disabled={!replyMessage.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a ticket</h3>
                <p className="text-gray-500">Choose a ticket from the list to view details and respond.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
