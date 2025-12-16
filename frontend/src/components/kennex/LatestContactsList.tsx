'use client';

import React from 'react';
import { PhoneIcon } from '@heroicons/react/24/outline';

interface Contact {
  id: number;
  name: string;
  phone: string;
  lastContactedAt: string;
}

interface LatestContactsListProps {
  contacts: Contact[];
}

const LatestContactsList = ({ contacts }: LatestContactsListProps) => {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else {
      return `${diffInHours} hours ago`;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Latest Contacts</h3>
      
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <PhoneIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {contact.name}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-xs text-gray-500">
                {formatTimeAgo(contact.lastContactedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LatestContactsList;