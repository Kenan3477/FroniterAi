'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SummaryData {
  interactions_today: number;
  interactions_change_pct: number;
  interaction_outcomes: Record<string, number>;
  interactions_time_seconds: number;
  dmcs: number;
  conversions: number;
  conversion_rate: number;
}

const InteractionsTimeCard = () => {
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

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Interactions Time</h3>
        <p className="text-red-500">Failed to load data</p>
      </div>
    );
  }

  const totalSeconds = summary?.interactions_time_seconds || 0;
  const formattedTime = formatTime(totalSeconds);

  // Generate sample data for the line chart
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    hour: i + 8, // 8 AM to 7 PM
    value: Math.floor(Math.random() * totalSeconds * 0.2) + totalSeconds * 0.1,
  }));

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Interactions Time</h3>
      
      <div className="flex flex-col">
        <div className="text-3xl font-bold text-gray-900 mb-4">
          {formattedTime}
        </div>
        
        {/* Mini line chart */}
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InteractionsTimeCard;