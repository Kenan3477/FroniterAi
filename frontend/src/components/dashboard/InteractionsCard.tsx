'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SummaryData {
  interactions_today: number;
  interactions_change_pct: number;
  interaction_outcomes: Record<string, number>;
  interactions_time_seconds: number;
  dmcs: number;
  conversions: number;
  conversion_rate: number;
}

const InteractionsCard = () => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async (): Promise<SummaryData> => {
      const response = await fetch('/api/dashboard/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard summary');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Interactions</h3>
        <p className="text-red-500">Failed to load data</p>
      </div>
    );
  }

  const changeColor = (summary?.interactions_change_pct || 0) >= 0 ? 'text-slate-600' : 'text-red-600';
  const changeSymbol = (summary?.interactions_change_pct || 0) >= 0 ? '+' : '';

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">Interactions</h3>
        <div className="text-xs text-gray-500">Today</div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-900">
            {summary?.interactions_today || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              (summary?.interactions_change_pct || 0) >= 0 ? 'bg-green-100 text-slate-800' : 'bg-red-100 text-red-800'
            }`}>
              {changeSymbol}{summary?.interactions_change_pct || 0}%
            </span>
            <span className="ml-2">vs yesterday</span>
          </div>
        </div>
        
        {/* Mini sparkline chart */}
        <div className="w-20 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { value: Math.max(1, (summary?.interactions_today || 0) * 0.7) },
              { value: Math.max(1, (summary?.interactions_today || 0) * 0.9) },
              { value: Math.max(1, (summary?.interactions_today || 0) * 0.6) },
              { value: Math.max(1, (summary?.interactions_today || 0) * 1.1) },
              { value: summary?.interactions_today || 1 },
            ]}>
              <Bar dataKey="value" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InteractionsCard;