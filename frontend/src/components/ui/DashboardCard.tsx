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
    <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
              {icon}
            </div>
          </div>
          <div className="ml-4 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                {trend && (
                  <div className={`ml-2 flex items-center text-sm font-medium ${
                    trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
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
                    {trend.value}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}