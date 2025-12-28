'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HomeIcon, 
  BriefcaseIcon, 
  UsersIcon, 
  ChartBarIcon, 
  CogIcon,
  PhoneIcon,
  BellIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  MicrophoneIcon,
  EyeIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const allNavigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
  { name: 'Work', href: '/work', icon: BriefcaseIcon, roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
  { name: 'Contacts', href: '/contacts', icon: UsersIcon, roles: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
  { name: 'Agent Coaching', href: '/agent-coaching', icon: EyeIcon, roles: ['ADMIN', 'SUPERVISOR'] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: ['ADMIN', 'SUPERVISOR'] },
  { name: 'Admin', href: '/admin', icon: CogIcon, roles: ['ADMIN'] },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter(item => {
    if (!user?.role) return true; // Show all items if role is not available (fallback)
    return item.roles.includes(user.role);
  });

  console.log('🔍 Sidebar - User role:', user?.role, 'Available items:', navigationItems.map(item => item.name));
  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          {!collapsed && (
            <div className="flex items-center space-x-1">
              <span className="text-lg font-bold text-gray-900">OMNI</span>
              
              {/* Voice Wave V replacement - smaller for sidebar, flipped upside down */}
              <div className="flex items-start justify-center h-5 space-x-0.5 mx-1">
                {/* Voice wave bars representing the "V" - now pointing downward */}
                <div className="w-1 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full animate-pulse" 
                     style={{ height: '60%', animationDelay: '0s', animationDuration: '1.5s' }}></div>
                <div className="w-1 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full animate-pulse" 
                     style={{ height: '40%', animationDelay: '0.2s', animationDuration: '1.3s' }}></div>
                <div className="w-1 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded-full animate-pulse" 
                     style={{ height: '80%', animationDelay: '0.4s', animationDuration: '1.7s' }}></div>
                <div className="w-1 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full animate-pulse" 
                     style={{ height: '100%', animationDelay: '0.1s', animationDuration: '1.4s' }}></div>
                <div className="w-1 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full animate-pulse" 
                     style={{ height: '70%', animationDelay: '0.3s', animationDuration: '1.6s' }}></div>
                <div className="w-1 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded-full animate-pulse" 
                     style={{ height: '50%', animationDelay: '0.5s', animationDuration: '1.2s' }}></div>
                <div className="w-1 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full animate-pulse" 
                     style={{ height: '35%', animationDelay: '0.6s', animationDuration: '1.8s' }}></div>
              </div>
              
              <span className="text-lg font-bold text-gray-900">OX AI</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                isActive
                  ? 'bg-slate-100 text-slate-900 border-r-2 border-slate-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}
            >
              <item.icon
                className={`${
                  isActive ? 'text-omnivox-500' : 'text-gray-400 group-hover:text-gray-500'
                } mr-3 flex-shrink-0 h-6 w-6`}
                aria-hidden="true"
              />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <div className="flex items-center space-x-2">
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="text-sm">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}