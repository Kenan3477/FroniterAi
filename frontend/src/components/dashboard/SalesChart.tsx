'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesData {
  total_sales_count: number;
  daily_breakdown: Array<{
    date: string;
    sales_count: number;
  }>;
}

const SalesChart = () => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  const { data: salesData, isLoading, error } = useQuery({
    queryKey: ['dashboard-sales', currentMonth],
    queryFn: async (): Promise<SalesData> => {
      const response = await fetch(`/api/dashboard/sales?month=${currentMonth}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sales</h3>
        <p className="text-red-500">Failed to load sales data</p>
      </div>
    );
  }

  // Format data for chart - show only days with sales or recent days
  const chartData = salesData?.daily_breakdown
    ?.filter(day => day.sales_count > 0 || new Date(day.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    ?.map(day => ({
      ...day,
      day: new Date(day.date).getDate(),
    })) || [];

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Sales</h3>
        <p className="text-sm text-gray-500">
          Sales This Month: <span className="font-medium">{salesData?.total_sales_count || 0}</span>
        </p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              formatter={(value) => [value, 'Sales']}
              labelFormatter={(label) => `Day ${label}`}
            />
            <Bar 
              dataKey="sales_count" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;