'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Work', href: '/work', icon: BriefcaseIcon },
  { name: 'Contacts', href: '/contacts', icon: UsersIcon },
  { name: 'Advanced Contacts', href: '/contacts-advanced', icon: UsersIcon },
  { name: 'Agent Coaching', href: '/agent-coaching', icon: EyeIcon },
  { name: 'Advanced Reports', href: '/advanced-reports', icon: DocumentChartBarIcon },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon },
  { name: 'Admin', href: '/admin', icon: CogIcon },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-kennex-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-gray-900">Kennex AI</span>
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
                  ? 'bg-kennex-100 text-kennex-900 border-r-2 border-kennex-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}
            >
              <item.icon
                className={`${
                  isActive ? 'text-kennex-500' : 'text-gray-400 group-hover:text-gray-500'
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