'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeAppRole } from '@/lib/authRole';
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
  CpuChipIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const allNavigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['ADMIN', 'SUPERVISOR', 'AGENT', 'SUPER_ADMIN', 'MANAGER'] },
  { name: 'Work', href: '/work', icon: BriefcaseIcon, roles: ['ADMIN', 'SUPERVISOR', 'AGENT', 'SUPER_ADMIN', 'MANAGER'] },
  { name: 'Contacts', href: '/contacts', icon: UsersIcon, roles: ['ADMIN', 'SUPERVISOR', 'AGENT', 'SUPER_ADMIN', 'MANAGER'] },
  { name: 'Agent Coaching', href: '/agent-coaching', icon: EyeIcon, roles: ['ADMIN', 'SUPERVISOR', 'SUPER_ADMIN', 'MANAGER'] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: ['ADMIN', 'SUPERVISOR', 'SUPER_ADMIN', 'MANAGER'] },
  { name: 'Admin', href: '/admin', icon: CogIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const normalizedRole = normalizeAppRole(user?.role);

  // Filter navigation items based on user role (JWT/backend casing may vary)
  let navigationItems = allNavigationItems.filter((item) => {
    if (!normalizedRole) return true;
    return item.roles.includes(normalizedRole);
  });

  // If role is missing or unknown, still show full nav so the app remains usable
  if (user && navigationItems.length === 0) {
    console.warn('⚠️ Sidebar: unknown role for nav filter:', user.role, '- showing all items');
    navigationItems = allNavigationItems;
  }

  console.log(
    '🔍 Sidebar - User role:',
    user?.role,
    'normalized:',
    normalizedRole,
    'items:',
    navigationItems.map((item) => item.name),
  );
  return (
    <div className={`theme-bg-primary theme-border border-r flex flex-col transition-all duration-300 backdrop-blur-xl ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 theme-border border-b backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          {!collapsed && (
            <div className="flex items-center space-x-1">
              <span className="text-lg font-bold text-slate-900 dark:text-white theme-text-primary">
                OMNI
              </span>
              
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
              
              <span className="text-lg font-bold text-slate-900 dark:text-white theme-text-primary">
                OX AI
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation — explicit Tailwind contrast so links never disappear (white-on-white) */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive
                  ? 'bg-slate-200 text-slate-900 border-r-2 border-blue-600 dark:bg-neutral-800 dark:text-white dark:border-cyan-400'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white'
              }`}
            >
              <item.icon
                className={`${
                  isActive
                    ? 'text-blue-600 dark:text-cyan-300'
                    : 'text-slate-500 group-hover:text-slate-800 dark:text-neutral-400 dark:group-hover:text-white'
                } mr-3 flex-shrink-0 h-6 w-6`}
                aria-hidden="true"
              />
              {!collapsed && (
                <span className="text-slate-900 dark:text-white">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="theme-border border-t p-4">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 theme-text-secondary hover:opacity-90 transition-colors duration-150 rounded-md hover:bg-[var(--theme-primary-hover)]"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <div className="flex items-center space-x-2">
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="text-sm theme-text-primary">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}