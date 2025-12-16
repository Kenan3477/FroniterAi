'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface InteractionsDurationData {
  date: string;
  channel: string;
  avg_duration_seconds: number;
  total_duration_seconds: number;
}

const InteractionsDurationChart = () => {
  const { data: durationData, isLoading, error } = useQuery({
    queryKey: ['dashboard-interactions-duration'],
    queryFn: async (): Promise<InteractionsDurationData[]> => {
      const response = await fetch('/api/dashboard/interactions-duration?days=5');
      if (!response.ok) {
        throw new Error('Failed to fetch interactions duration data');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Interactions Duration (Last 5 days)</h3>
        <p className="text-red-500">Failed to load duration data</p>
      </div>
    );
  }

  // Transform data for stacked bar chart
  const chartData: { [date: string]: any } = {};
  
  durationData?.forEach(item => {
    const dateKey = new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (!chartData[dateKey]) {
      chartData[dateKey] = { date: dateKey };
    }
    
    chartData[dateKey][item.channel] = Math.round(item.avg_duration_seconds / 60); // Convert to minutes
  });

  const formattedData = Object.values(chartData);

  // Colors for different channels
  const channelColors: { [key: string]: string } = {
    voice: '#3b82f6',
    email: '#10b981',
    sms: '#f59e0b',
    chat: '#8b5cf6',
  };

  // Get unique channels for legend
  const channels = Array.from(new Set(durationData?.map(item => item.channel) || []));

  const formatTooltip = (value: number, name: string) => [
    `${value} min`,
    name.charAt(0).toUpperCase() + name.slice(1)
  ];

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Interactions Duration (Last 5 days)
      </h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Duration (minutes)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            
            {channels.map(channel => (
              <Bar
                key={channel}
                dataKey={channel}
                fill={channelColors[channel] || '#6b7280'}
                name={channel.charAt(0).toUpperCase() + channel.slice(1)}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default InteractionsDurationChart;