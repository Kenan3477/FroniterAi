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
    <div className="theme-card overflow-hidden shadow-2xl rounded-2xl hover:shadow-2xl transition-all duration-500 group backdrop-blur-xl">
      <div className="p-6 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold theme-text-secondary uppercase tracking-wider">{title}</p>
              <p className="text-4xl font-bold theme-text-primary mt-2 group-hover:scale-105 transition-transform duration-300">{value}</p>
            </div>
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-md border ${
              trend.direction === 'up' 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}>
              {trend.direction === 'up' ? (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}