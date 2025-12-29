'use client';

import React, { useState, useEffect } from 'react';
import AgentStatusBar from '@/components/omnivox/AgentStatusBar';
import InteractionsCard from '@/components/omnivox/InteractionsCard';
import InteractionOutcomesCard from '@/components/omnivox/InteractionOutcomesCard';
import InteractionsTimeCard from '@/components/omnivox/InteractionsTimeCard';
import DmcsConversionCard from '@/components/omnivox/DmcsConversionCard';
import SalesChart from '@/components/omnivox/SalesChart';
import InteractionsDurationChart from '@/components/omnivox/InteractionsDurationChart';
import LatestContactsList from '@/components/omnivox/LatestContactsList';
import TasksTable from '@/components/omnivox/TasksTable';

// Sidebar component
const Sidebar = () => {
  return (
    <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-6">
      {/* Logo */}
      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">K</span>
      </div>
      
      {/* Navigation Icons */}
      {[
        '🏠', '📊', '👥', '📞', '📋', '⚙️'
      ].map((icon, index) => (
        <button
          key={index}
          className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600 transition-colors"
        >
          <span className="text-lg">{icon}</span>
        </button>
      ))}
    </div>
  );
};

export default function KennexDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/kennex/dashboard');
        if (response.ok) {
          const result = await response.json();
          setDashboardData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Agent Status Bar */}
        <AgentStatusBar />
        
        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <InteractionsCard 
              count={dashboardData.summary.interactionsToday}
              changePercent={dashboardData.summary.interactionsChangePct}
            />
            <InteractionOutcomesCard 
              outcomes={dashboardData.summary.interactionOutcomes}
            />
            <InteractionsTimeCard 
              totalSeconds={dashboardData.summary.interactionsTimeSeconds}
            />
            <DmcsConversionCard 
              dmcs={dashboardData.summary.dmcs}
              conversionRate={dashboardData.summary.conversionRate}
            />
          </div>
          
          {/* Middle Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesChart salesData={dashboardData.salesData} />
            <InteractionsDurationChart data={dashboardData.interactionsDuration} />
          </div>
          
          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LatestContactsList contacts={dashboardData.latestContacts} />
            <TasksTable tasks={dashboardData.tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}