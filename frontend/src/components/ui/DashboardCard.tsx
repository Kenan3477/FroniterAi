'use client';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export default function DashboardCard({ title, value, icon, color, trend }: DashboardCardProps) {
  return (
    <div className="theme-card rounded-lg p-6 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium theme-text-secondary uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-semibold theme-text-primary">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-md border ${
            trend.direction === 'up' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
          }`}>
            {trend.direction === 'up' ? (
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}
