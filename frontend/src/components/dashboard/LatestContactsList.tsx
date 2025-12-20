'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PhoneIcon } from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  name: string;
  phone: string;
  last_contacted_at: string;
}

const LatestContactsList = () => {
  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['latest-contacts'],
    queryFn: async (): Promise<Contact[]> => {
      const response = await fetch('/api/contacts/latest?limit=5');
      if (!response.ok) {
        throw new Error('Failed to fetch latest contacts');
      }
      return response.json();
    },
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const contactDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Latest Contacts</h3>
        <p className="text-red-500">Failed to load contacts</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Latest Contacts</h3>
      
      <div className="space-y-4">
        {contacts?.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No contacts found</p>
        ) : (
          contacts?.map((contact) => (
            <div key={contact.id} className="flex items-center space-x-4">
              {/* Phone Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <PhoneIcon className="w-5 h-5 text-slate-600" />
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {contact.name || 'Not Set'}
                </div>
                <div className="text-sm text-gray-500">
                  {contact.phone}
                </div>
              </div>
              
              {/* Time Ago */}
              <div className="flex-shrink-0 text-xs text-gray-500">
                {formatTimeAgo(contact.last_contacted_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LatestContactsList;