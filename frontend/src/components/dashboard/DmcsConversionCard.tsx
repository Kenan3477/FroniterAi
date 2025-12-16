'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface SummaryData {
  interactions_today: number;
  interactions_change_pct: number;
  interaction_outcomes: Record<string, number>;
  interactions_time_seconds: number;
  dmcs: number;
  conversions: number;
  conversion_rate: number;
}

const DmcsConversionCard = () => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async (): Promise<SummaryData> => {
      const response = await fetch('/api/dashboard/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard summary');
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-2">DMCs / Conversion</h3>
        <p className="text-red-500">Failed to load data</p>
      </div>
    );
  }

  const dmcs = summary?.dmcs || 0;
  const conversionRate = summary?.conversion_rate || 0;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">DMCs / Conversion</h3>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {dmcs}
          </div>
          <div className="text-sm text-gray-500">
            DMC's
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {conversionRate.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-500">
            Conversion
          </div>
        </div>
      </div>
      
      {/* Progress bar for conversion rate */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">Conversion Rate</span>
          <span className="text-xs text-gray-700 font-medium">{conversionRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(conversionRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default DmcsConversionCard;