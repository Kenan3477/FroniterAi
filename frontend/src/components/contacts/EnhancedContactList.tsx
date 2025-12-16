/**
 * Enhanced Contact List Display
 * Shows contacts with relevant details and info buttons for accessing
 * detailed contact analysis including source list, upload dates, and call history
 * with campaign isolation
 */

import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  Building, 
  Info, 
  Calendar, 
  Clock, 
  TrendingUp,
  FileText,
  Target,
  User
} from 'lucide-react';
import ContactInfoModal from './ContactInfoModal';
import { useAuth } from '@/contexts/AuthContext';

interface Contact {
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  status: string;
  attemptCount: number;
  lastAttempt?: Date;
  lastOutcome?: string;
  listName: string;
  uploadDate: Date;
  totalCalls: number;
  hasNotes: boolean;
  campaignId?: string;
  campaignName?: string;
}

interface EnhancedContactListProps {
  searchTerm?: string;
  statusFilter?: string;
}

export default function EnhancedContactList({ 
  searchTerm = '', 
  statusFilter = '' 
}: EnhancedContactListProps) {
  const { currentCampaign } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    if (currentCampaign) {
      fetchContacts();
    }
  }, [currentCampaign, searchTerm, statusFilter]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      if (!currentCampaign) {
        setContacts([]);
        return;
      }

      const params = new URLSearchParams();
      params.append('campaignId', currentCampaign.campaignId); // Required for campaign isolation
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/contacts/enhanced?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      } else if (response.status === 400) {
        console.warn('Campaign ID required for contact access');
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      'new': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-green-100 text-green-800',
      'attempted': 'bg-yellow-100 text-yellow-800',
      'callback': 'bg-purple-100 text-purple-800',
      'final': 'bg-gray-100 text-gray-800',
      'completed': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getOutcomeColor = (outcome?: string): string => {
    if (!outcome) return 'text-gray-500';
    
    const colors: { [key: string]: string } = {
      'answered': 'text-green-600',
      'connected': 'text-green-600',
      'interested': 'text-blue-600',
      'sale': 'text-emerald-600',
      'callback': 'text-purple-600',
      'no_answer': 'text-gray-600',
      'busy': 'text-orange-600',
      'voicemail': 'text-indigo-600'
    };
    
    const normalizedOutcome = outcome.toLowerCase().replace(/[^a-z]/g, '_');
    return colors[normalizedOutcome] || 'text-gray-600';
  };

  const handleInfoClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowInfoModal(true);
  };

  const handleCloseModal = () => {
    setShowInfoModal(false);
    setSelectedContactId(null);
  };

  if (!currentCampaign) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No Campaign Selected</h3>
        <p className="mt-1 text-gray-500">
          Please select a campaign to view contacts. Campaign isolation ensures you only see relevant data.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kennex-600"></div>
        <span className="ml-3 text-gray-600">Loading contacts for {currentCampaign.name}...</span>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchTerm || statusFilter 
            ? 'Try adjusting your search or filter criteria.' 
            : 'Upload a CSV or Excel file to add contacts to this list.'
          }
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            Contact List ({contacts.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Detailed contact information with source tracking and call history
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {contacts.map((contact) => (
            <div key={contact.contactId} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                {/* Contact Basic Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-kennex-100 rounded-full flex items-center justify-center">
                    <span className="text-kennex-600 font-semibold text-lg">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </h4>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {contact.phone}
                      </span>
                      
                      {contact.email && (
                        <span className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {contact.email}
                        </span>
                      )}
                      
                      {contact.company && (
                        <span className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {contact.company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Contact Stats */}
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {contact.attemptCount}
                    </div>
                    <div className="text-xs text-gray-500">Times Dialed</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {contact.totalCalls}
                    </div>
                    <div className="text-xs text-gray-500">Total Calls</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(contact.status)
                    }`}>
                      {contact.status.toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Info Button */}
                  <button
                    onClick={() => handleInfoClick(contact.contactId)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-kennex-600 bg-kennex-50 border border-kennex-300 rounded-md hover:bg-kennex-100 transition-colors"
                    title="View detailed contact information"
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Info
                  </button>
                </div>
              </div>
              
              {/* Contact Metadata */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Target className="h-4 w-4 mr-2 text-kennex-500" />
                  <span className="font-medium">List:</span>
                  <span className="ml-1">{contact.listName}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-kennex-500" />
                  <span className="font-medium">Uploaded:</span>
                  <span className="ml-1">{formatDate(contact.uploadDate)}</span>
                </div>
                
                {contact.lastAttempt && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-kennex-500" />
                    <span className="font-medium">Last Call:</span>
                    <span className="ml-1">{formatDate(contact.lastAttempt)}</span>
                  </div>
                )}
                
                {contact.lastOutcome && (
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-kennex-500" />
                    <span className="font-medium text-gray-600">Outcome:</span>
                    <span className={`ml-1 font-medium ${getOutcomeColor(contact.lastOutcome)}`}>
                      {contact.lastOutcome}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Call Notes Indicator */}
              {contact.hasNotes && (
                <div className="mt-3 flex items-center text-xs text-gray-500">
                  <FileText className="h-4 w-4 mr-1" />
                  Has call notes
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Contact Info Modal */}
      {selectedContactId && (
        <ContactInfoModal
          isOpen={showInfoModal}
          onClose={handleCloseModal}
          contactId={selectedContactId}
        />
      )}
    </>
  );
}