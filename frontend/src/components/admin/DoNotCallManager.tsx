import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  PhoneXMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface DncNumber {
  id: number;
  phoneNumber: string;
  originalFormat: string;
  reason: string;
  addedBy: string;
  createdAt: string;
}

interface DncStats {
  totalCount: number;
  todayCount: number;
  recentlyAdded: Array<{
    phoneNumber: string;
    originalFormat: string;
    reason: string;
    createdAt: string;
  }>;
}

interface DoNotCallManagerProps {
  onUpdate?: (data: any) => void;
}

export default function DoNotCallManager({ onUpdate }: DoNotCallManagerProps) {
  const [dncNumbers, setDncNumbers] = useState<DncNumber[]>([]);
  const [stats, setStats] = useState<DncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newReason, setNewReason] = useState('');
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDncNumbers();
    fetchDncStats();
  }, [currentPage, searchQuery]);

  const fetchDncNumbers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        search: searchQuery
      });

      const response = await fetch(`/api/admin/dnc?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setDncNumbers(result.data);
        setTotalPages(result.pagination?.totalPages || 1);
      } else {
        console.error('Failed to fetch DNC numbers:', result.error);
        // Show demo data if backend fails
        setDncNumbers([]);
      }
    } catch (error) {
      console.error('Error fetching DNC numbers:', error);
      setDncNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDncStats = async () => {
    try {
      const response = await fetch('/api/admin/dnc/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching DNC stats:', error);
    }
  };

  const handleAddNumber = async () => {
    if (!newNumber.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/dnc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          phoneNumber: newNumber.trim(),
          reason: newReason.trim() || 'Customer request',
          addedBy: 'Admin'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setNewNumber('');
        setNewReason('');
        setShowAddModal(false);
        await fetchDncNumbers();
        await fetchDncStats();
        onUpdate?.(result.data);
      } else {
        alert(result.error || 'Failed to add number');
      }
    } catch (error) {
      console.error('Error adding DNC number:', error);
      alert('Failed to add number to DNC list');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveNumber = async (id: number, phoneNumber: string) => {
    if (!confirm(`Are you sure you want to remove ${phoneNumber} from the DNC list?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/dnc/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchDncNumbers();
        await fetchDncStats();
        onUpdate?.({ removed: id });
      } else {
        alert(result.error || 'Failed to remove number');
      }
    } catch (error) {
      console.error('Error removing DNC number:', error);
      alert('Failed to remove number from DNC list');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkNumbers.trim() || isSubmitting) return;

    const numbers = bulkNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (numbers.length === 0) {
      alert('Please enter at least one phone number');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/dnc/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          numbers,
          reason: bulkReason.trim() || 'Bulk import',
          addedBy: 'Admin'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setBulkNumbers('');
        setBulkReason('');
        setShowBulkImportModal(false);
        await fetchDncNumbers();
        await fetchDncStats();
        const { added, skipped, errors } = result.data;
        alert(`Import complete: ${added} added, ${skipped} skipped${errors.length > 0 ? `, ${errors.length} errors` : ''}`);
        onUpdate?.(result.data);
      } else {
        alert(result.error || 'Failed to import numbers');
      }
    } catch (error) {
      console.error('Error importing DNC numbers:', error);
      alert('Failed to import numbers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNumbers = dncNumbers;

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex justify-between items-center w-full">
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && currentPage === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <PhoneXMarkIcon className="h-6 w-6 mr-2 text-red-500" />
            Do Not Call Management
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage phone numbers that should never be called by the dialer
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkImportModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Bulk Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Number
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PhoneXMarkIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Blocked Numbers
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalCount.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PlusIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Added Today
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.todayCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Compliance Status
                    </dt>
                    <dd className="text-lg font-medium text-green-600">
                      Active
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search phone numbers, reasons, or who added them..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* DNC Numbers List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">
            Blocked Numbers ({filteredNumbers.length}{currentPage > 1 ? ` of many` : ''})
          </h4>
        </div>
        <div className="overflow-hidden">
          {filteredNumbers.length === 0 ? (
            <div className="text-center py-12">
              <PhoneXMarkIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No blocked numbers</h3>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'No numbers match your search.' : 'Add numbers to the DNC list to prevent calls.'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {filteredNumbers.map((number) => (
                  <div key={number.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{number.originalFormat}</span>
                        {number.originalFormat !== number.phoneNumber && (
                          <span className="ml-2 text-sm text-gray-500">({number.phoneNumber})</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        <span>Reason: {number.reason}</span>
                        <span className="mx-2">•</span>
                        <span>Added by: {number.addedBy}</span>
                        <span className="mx-2">•</span>
                        <span>Date: {new Date(number.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveNumber(number.id, number.originalFormat)}
                      className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      title="Remove from DNC list"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      </div>

      {/* Add Number Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Number to DNC List</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="+1234567890 or (123) 456-7890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Customer request, complaint, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNumber}
                disabled={isSubmitting || !newNumber.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Number'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Import DNC Numbers</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Numbers (one per line)
                </label>
                <textarea
                  value={bulkNumbers}
                  onChange={(e) => setBulkNumbers(e.target.value)}
                  placeholder={`+1234567890\n(123) 456-7890\n123-456-7890\n+44 20 1234 5678`}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (for all numbers)
                </label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Bulk import, customer complaints, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBulkImportModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={isSubmitting || !bulkNumbers.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Importing...' : 'Import Numbers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}