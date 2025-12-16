'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SalesData {
  totalSalesCount: number;
  dailyBreakdown: Array<{ date: string; salesCount: number }>;
}

interface SalesChartProps {
  salesData: SalesData;
}

const SalesChart = ({ salesData }: SalesChartProps) => {
  // Format dates for display
  const chartData = salesData.dailyBreakdown.map(item => ({
    ...item,
    day: new Date(item.date).getDate()
  }));

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Sales</h3>
        <div className="text-sm text-gray-600">
          Sales This Month: <span className="font-medium">{salesData.totalSalesCount}</span> 
          <span className="ml-2 inline-flex items-center text-xs text-gray-500">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            +2.7%
          </span>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis hide />
            <Bar 
              dataKey="salesCount" 
              fill="#10B981" 
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;