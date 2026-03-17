'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';

interface InteractionsDurationData {
  date: string;
  channel: string;
  avgDurationSeconds: number;
  totalDurationSeconds: number;
}

interface InteractionsDurationChartProps {
  data: InteractionsDurationData[];
}

const InteractionsDurationChart = ({ data }: InteractionsDurationChartProps) => {
  // Group data by date and aggregate by channel
  const chartData = data.reduce((acc, item) => {
    const date = new Date(item.date);
    const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;
    
    const existing = acc.find(d => d.date === dayMonth);
    if (existing) {
      existing[item.channel] = Math.round(item.avgDurationSeconds / 60); // Convert to minutes
    } else {
      acc.push({
        date: dayMonth,
        [item.channel]: Math.round(item.avgDurationSeconds / 60)
      });
    }
    return acc;
  }, [] as any[]);

  // Get unique channels for colors
  const channels = Array.from(new Set(data.map(d => d.channel)));
  const channelColors = {
    voice: '#3B82F6',
    email: '#EF4444',
    chat: '#10B981',
    sms: '#F59E0B'
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Interactions Duration (Last 5 days)</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
            />
            <Legend />
            {channels.map(channel => (
              <Bar 
                key={channel}
                dataKey={channel} 
                fill={(channelColors as any)[channel] || '#6B7280'}
                radius={[2, 2, 0, 0]}
                name={channel.charAt(0).toUpperCase() + channel.slice(1)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default InteractionsDurationChart;