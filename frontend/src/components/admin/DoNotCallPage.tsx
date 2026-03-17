'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Download, Search, Trash2, Phone, PhoneOff, AlertTriangle } from 'lucide-react';

interface DNCEntry {
  id: string;
  phoneNumber: string;
  countryCode?: string;
  reason: string;
  source: 'MANUAL' | 'CUSTOMER_REQUEST' | 'REGULATORY' | 'AUTOMATED' | 'IMPORT';
  isActive: boolean;
  notes?: string;
  addedBy?: {
    id: string;
    name: string;
    email: string;
  };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DNCStats {
  total: number;
  active: number;
  expired: number;
  bySource: Record<string, number>;
  recentlyAdded: number;
}

const DoNotCallPage: React.FC = () => {
  const [dncEntries, setDncEntries] = useState<DNCEntry[]>([]);
  const [stats, setStats] = useState<DNCStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newSource, setNewSource] = useState<DNCEntry['source']>('MANUAL');

  useEffect(() => {
    fetchDNCData();
  }, []);

  const fetchDNCData = async () => {
    try {
      setLoading(true);
      const [entriesResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/dnc').catch(() => ({ json: () => ({ data: [] }) })),
        fetch('/api/admin/dnc/stats').catch(() => ({ json: () => ({}) }))
      ]);

      const entriesData = await entriesResponse.json();
      const statsData = await statsResponse.json();

      setDncEntries(entriesData.data || []);
      
      // Provide default stats if API doesn't return expected format
      const defaultStats: DNCStats = {
        total: 0,
        active: 0,
        expired: 0,
        bySource: {},
        recentlyAdded: 0
      };
      
      setStats((statsData as any).data || (statsData as any) || defaultStats);
    } catch (err) {
      setError('Failed to fetch DNC data');
      console.error('Error fetching DNC data:', err);
      
      setStats({
        total: 0,
        active: 0,
        expired: 0,
        bySource: {},
        recentlyAdded: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    if (!newNumber.trim()) return;

    try {
      const response = await fetch('/api/admin/dnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: newNumber.trim(),
          reason: newReason || 'Manual addition',
          source: newSource
        })
      });

      if (response.ok) {
        setNewNumber('');
        setNewReason('');
        setNewSource('MANUAL');
        setIsAddDialogOpen(false);
        await fetchDNCData();
      }
    } catch (err) {
      console.error('Error adding DNC entry:', err);
    }
  };

  const handleRemoveNumber = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/dnc/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchDNCData();
      }
    } catch (err) {
      console.error('Error removing DNC entry:', err);
    }
  };

  const handleBulkImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/dnc/bulk-import', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await fetchDNCData();
      }
    } catch (err) {
      console.error('Error during bulk import:', err);
    }
  };

  const filteredEntries = dncEntries.filter(entry =>
    entry.phoneNumber.includes(searchQuery) ||
    entry.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading Do Not Call registry...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Do Not Call (DNC) Registry</h1>
          <p className="text-muted-foreground">Manage numbers that should not be contacted</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Number
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total DNC Numbers</CardTitle>
              <PhoneOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Blocks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <Phone className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.expired}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
              <Plus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.recentlyAdded}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phone numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => e.target.files?.[0] && handleBulkImport(e.target.files[0])}
            className="hidden"
            id="bulk-import"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('bulk-import')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* DNC Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>DNC Registry ({filteredEntries.length} numbers)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No DNC entries found. Add numbers to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Phone Number</th>
                    <th className="text-left p-2">Reason</th>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Added</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono">{entry.phoneNumber}</td>
                      <td className="p-2">{entry.reason}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          entry.source === 'MANUAL' ? 'bg-blue-100 text-blue-800' :
                          entry.source === 'CUSTOMER_REQUEST' ? 'bg-red-100 text-red-800' :
                          entry.source === 'REGULATORY' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.source}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          entry.isActive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {entry.isActive ? 'BLOCKED' : 'EXPIRED'}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveNumber(entry.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Number Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Add Number to DNC Registry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <Input
                  placeholder="+1234567890"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <Input
                  placeholder="Customer request, regulatory compliance, etc."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value as DNCEntry['source'])}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="MANUAL">Manual Addition</option>
                  <option value="CUSTOMER_REQUEST">Customer Request</option>
                  <option value="REGULATORY">Regulatory Compliance</option>
                  <option value="AUTOMATED">Automated System</option>
                  <option value="IMPORT">Bulk Import</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddNumber} className="flex-1">
                  Add to DNC
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DoNotCallPage;