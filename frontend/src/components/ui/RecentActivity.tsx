'use client';

interface ActivityItem {
  id: string;
  type: 'call' | 'email' | 'meeting';
  contact: string;
  description: string;
  time: string;
  status: 'success' | 'pending' | 'failed';
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'call',
    contact: 'John Smith',
    description: 'Outbound call completed successfully',
    time: '2 minutes ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'email',
    contact: 'Sarah Johnson',
    description: 'Follow-up email sent',
    time: '15 minutes ago',
    status: 'success',
  },
  {
    id: '3',
    type: 'call',
    contact: 'Mike Wilson',
    description: 'Call attempt - no answer',
    time: '32 minutes ago',
    status: 'failed',
  },
  {
    id: '4',
    type: 'meeting',
    contact: 'Emily Davis',
    description: 'Meeting scheduled for tomorrow',
    time: '1 hour ago',
    status: 'pending',
  },
];

export default function RecentActivity({ activities = mockActivities }: RecentActivityProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'call':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </div>
        );
      case 'email':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
        );
      case 'meeting':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No recent activity</p>
          <p className="text-sm">Start making calls to see your activity here</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            {getIcon(activity.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{activity.contact}</p>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
              <p className="text-sm text-gray-600">{activity.description}</p>
              <div className={`text-xs font-medium ${getStatusColor(activity.status)}`}>
                {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}