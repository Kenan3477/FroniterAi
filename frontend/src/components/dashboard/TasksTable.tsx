'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  user: string;
  name: string;
  campaign: string;
  type: string;
  notes: string | null;
  dueAt: string;
  status: string;
  createdAt: string;
}

interface TasksResponse {
  items: Task[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TasksTable = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('dueAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [status, setStatus] = useState('open');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when searching
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ['tasks', status, page, pageSize, debouncedSearch, sortField, sortDirection],
    queryFn: async (): Promise<TasksResponse> => {
      const params = new URLSearchParams({
        status,
        page: page.toString(),
        pageSize: pageSize.toString(),
        sort: sortField,
        direction: sortDirection,
      });
      
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    refetchInterval: 180000, // Refetch every 3 minutes
  });

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  }, [sortField]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUpIcon className="w-4 h-4 text-gray-600" />
      : <ArrowDownIcon className="w-4 h-4 text-gray-600" />;
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Tasks</h3>
        <p className="text-red-500">Failed to load tasks</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kennex-500 focus:border-kennex-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('user')}
              >
                <div className="flex items-center space-x-1">
                  <span>User</span>
                  <SortIcon field="user" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('campaign')}
              >
                <div className="flex items-center space-x-1">
                  <span>Campaign</span>
                  <SortIcon field="campaign" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                  <SortIcon field="type" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('dueAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Due Date</span>
                  <SortIcon field="dueAt" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              // Loading rows
              [...Array(pageSize)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : tasksData?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Sorry, no matching Tasks found
                </td>
              </tr>
            ) : (
              tasksData?.items.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.campaign}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      task.type === 'callback' ? 'bg-blue-100 text-blue-800' :
                      task.type === 'follow_up' ? 'bg-green-100 text-green-800' :
                      task.type === 'email' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {task.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(task.dueAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-kennex-600 hover:text-kennex-900">
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="border border-gray-300 rounded text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-kennex-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">
            {tasksData?.totalCount === 0 ? '0-0 of 0' : 
            `${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, tasksData?.totalCount || 0)} of ${tasksData?.totalCount || 0}`}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {tasksData?.totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(tasksData?.totalPages || 1, p + 1))}
            disabled={page === (tasksData?.totalPages || 1)}
            className="p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TasksTable;