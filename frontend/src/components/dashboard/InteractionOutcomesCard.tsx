'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface SummaryData {
  interactions_today: number;
  interactions_change_pct: number;
  interaction_outcomes: Record<string, number>;
  interactions_time_seconds: number;
  dmcs: number;
  conversions: number;
  conversion_rate: number;
}

const COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444',
};

const InteractionOutcomesCard = () => {
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
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Interaction Outcomes</h3>
        <p className="text-red-500">Failed to load data</p>
      </div>
    );
  }

  // Transform data for chart
  const outcomes = summary?.interaction_outcomes || {};
  const chartData = Object.entries(outcomes).map(([outcome, count]) => ({
    name: outcome,
    value: count,
    color: COLORS[outcome as keyof typeof COLORS] || '#6b7280',
  }));

  const totalInteractions = Object.values(outcomes).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Interaction Outcomes</h3>
      
      <div className="flex flex-col items-center">
        {/* Donut Chart */}
        <div className="w-32 h-32 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {Object.entries(outcomes).map(([outcome, count]) => (
            <div key={outcome} className="text-center">
              <div className="flex items-center justify-center mb-1">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[outcome as keyof typeof COLORS] || '#6b7280' }}
                />
                <span className="text-xs text-gray-500 capitalize">{outcome}</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">{count}</div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-3 text-center">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{totalInteractions}</div>
        </div>
      </div>
    </div>
  );
};

export default InteractionOutcomesCard;