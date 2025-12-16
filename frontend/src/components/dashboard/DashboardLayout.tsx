'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgentStatusBar from '@/components/dashboard/AgentStatusBar';
import InteractionsCard from '@/components/dashboard/InteractionsCard';
import InteractionOutcomesCard from '@/components/dashboard/InteractionOutcomesCard';
import InteractionsTimeCard from '@/components/dashboard/InteractionsTimeCard';
import DmcsConversionCard from '@/components/dashboard/DmcsConversionCard';
import SalesChart from '@/components/dashboard/SalesChart';
import InteractionsDurationChart from '@/components/dashboard/InteractionsDurationChart';
import LatestContactsList from '@/components/dashboard/LatestContactsList';
import TasksTable from '@/components/dashboard/TasksTable';
import {
  HomeIcon,
  PhoneIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const DashboardLayout = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Left Sidebar */}
        <div className="fixed left-0 top-0 h-full w-16 bg-gray-900 flex flex-col items-center py-4 z-50">
          {/* Logo */}
          <div className="w-8 h-8 bg-kennex-600 rounded flex items-center justify-center mb-8">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          
          {/* Navigation Icons */}
          <nav className="flex flex-col space-y-4">
            <button className="p-3 rounded-lg bg-kennex-600 text-white">
              <HomeIcon className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
              <ChartBarIcon className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
              <UserGroupIcon className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
              <CogIcon className="w-5 h-5" />
            </button>
          </nav>
          
          {/* Help Icon at Bottom */}
          <div className="mt-auto">
            <button className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
              <QuestionMarkCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-16">
          {/* Agent Status Bar */}
          <AgentStatusBar />
          
          {/* Dashboard Content */}
          <div className="p-6 space-y-6">
            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <InteractionsCard />
              <InteractionOutcomesCard />
              <InteractionsTimeCard />
              <DmcsConversionCard />
            </div>
            
            {/* Middle Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart />
              <InteractionsDurationChart />
            </div>
            
            {/* Bottom Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LatestContactsList />
              <TasksTable />
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default DashboardLayout;