/**
 * Contact Information Modal
 * Shows comprehensive contact details including source list info, 
 * call history, and analytics with campaign isolation
 */

import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, Building, Calendar, Clock, Users, Target, TrendingUp } from 'lucide-react';
import { ContactAnalysisData } from '@/services/contactAnalysisService';
import { useAuth } from '@/contexts/AuthContext';

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
}

interface CallHistoryEntry {
  date: Date;
  outcome: string;
  duration?: number;
  agentId?: string;
  notes?: string;
  agentName?: string;
}

export default function ContactInfoModal({ isOpen, onClose, contactId }: ContactInfoModalProps) {
  const { currentCampaign } = useAuth();
  const [contactData, setContactData] = useState<ContactAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics'>('overview');

  useEffect(() => {
    if (isOpen && contactId && currentCampaign) {
      fetchContactData();
    }
  }, [isOpen, contactId, currentCampaign]);

  const fetchContactData = async () => {
    try {
      setLoading(true);
      
      if (!currentCampaign) {
        console.warn('No campaign selected');
        return;
      }

      const url = `/api/contacts/${contactId}/analysis?campaignId=${currentCampaign.campaignId}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setContactData(data);
      } else if (response.status === 404) {
        console.warn('Contact not found or not accessible in current campaign');
        setContactData(null);
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOutcomeColor = (outcome: string): string => {
    const colors: { [key: string]: string } = {
      'answered': 'text-green-600 bg-green-50',
      'connected': 'text-green-600 bg-green-50',
      'sale': 'text-blue-600 bg-blue-50',
      'interested': 'text-blue-600 bg-blue-50',
      'callback': 'text-yellow-600 bg-yellow-50',
      'no_answer': 'text-gray-600 bg-gray-50',
      'busy': 'text-orange-600 bg-orange-50',
      'voicemail': 'text-purple-600 bg-purple-50',
      'failed': 'text-red-600 bg-red-50',
      'invalid': 'text-red-600 bg-red-50'
    };
    
    const normalizedOutcome = outcome.toLowerCase().replace(/[^a-z]/g, '_');
    return colors[normalizedOutcome] || 'text-gray-600 bg-gray-50';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-kennex-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">
                Contact Information
              </h2>
              <p className="text-kennex-100 text-sm">
                Detailed contact analysis and history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-kennex-100 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kennex-600"></div>
            <span className="ml-3 text-gray-600">Loading contact information...</span>
          </div>
        ) : contactData ? (
          <div className="flex flex-col h-full">
            {/* Contact Header Info */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-kennex-100 rounded-full flex items-center justify-center">
                    <span className="text-kennex-600 font-semibold text-lg">
                      {contactData.contact.firstName[0]}{contactData.contact.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {contactData.contact.fullName}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {contactData.contact.phone}
                      </span>
                      {contactData.contact.email && (
                        <span className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {contactData.contact.email}
                        </span>
                      )}
                      {contactData.contact.company && (
                        <span className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {contactData.contact.company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    contactData.contact.status === 'completed' ? 'bg-green-100 text-green-800' :
                    contactData.contact.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {contactData.contact.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex px-6">
                {[
                  { key: 'overview', label: 'Overview', icon: Target },
                  { key: 'history', label: 'Call History', icon: Clock },
                  { key: 'analytics', label: 'Analytics', icon: TrendingUp }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex items-center space-x-2 py-3 px-4 border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-kennex-600 text-kennex-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Source Information */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-kennex-600" />
                      Source Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Data List</label>
                        <p className="text-gray-900">{contactData.sourceInfo.listName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Upload Date</label>
                        <p className="text-gray-900">{formatDate(contactData.sourceInfo.uploadDate)}</p>
                      </div>
                      {contactData.sourceInfo.campaignName && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Campaign</label>
                          <p className="text-gray-900">{contactData.sourceInfo.campaignName}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact Added</label>
                        <p className="text-gray-900">{formatDate(contactData.contact.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Status */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-kennex-600" />
                      Contact Status
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Times Dialed</label>
                        <p className="text-gray-900">{contactData.contact.attemptCount}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Calls</label>
                        <p className="text-gray-900">{contactData.callHistory.totalCalls}</p>
                      </div>
                      {contactData.contact.lastAttempt && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Last Attempt</label>
                          <p className="text-gray-900">{formatDate(contactData.contact.lastAttempt)}</p>
                        </div>
                      )}
                      {contactData.contact.lastOutcome && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Last Outcome</label>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            getOutcomeColor(contactData.contact.lastOutcome)
                          }`}>
                            {contactData.contact.lastOutcome}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">Call History</h4>
                    <span className="text-sm text-gray-500">
                      {contactData.callHistory.totalCalls} total calls
                    </span>
                  </div>
                  
                  {contactData.callHistory.outcomes.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No call history</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This contact hasn't been called yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contactData.callHistory.outcomes.map((call, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                getOutcomeColor(call.outcome)
                              }`}>
                                {call.outcome}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(call.date)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm text-gray-500">
                              {call.agentName && (
                                <span>Agent: {call.agentName}</span>
                              )}
                              {call.duration && (
                                <span className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatDuration(call.duration)}
                                </span>
                              )}
                            </div>
                          </div>
                          {call.notes && (
                            <div className="mt-2">
                              <label className="text-sm font-medium text-gray-500">Notes:</label>
                              <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                                {call.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Total Contact Time</h5>
                    <p className="text-2xl font-bold text-kennex-600">
                      {formatDuration(contactData.callHistory.totalDuration)}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Average Call Length</h5>
                    <p className="text-2xl font-bold text-kennex-600">
                      {formatDuration(Math.round(contactData.analytics.averageCallDuration))}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Callbacks Scheduled</h5>
                    <p className="text-2xl font-bold text-kennex-600">
                      {contactData.analytics.callbacksScheduled}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Conversion Events</h5>
                    <p className="text-2xl font-bold text-kennex-600">
                      {contactData.analytics.conversionEvents}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Times Contacted</h5>
                    <p className="text-2xl font-bold text-kennex-600">
                      {contactData.analytics.timesSeen}
                    </p>
                  </div>
                  
                  {contactData.callHistory.firstCallDate && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h5 className="font-medium text-gray-900 mb-2">First Contact</h5>
                      <p className="text-sm text-gray-600">
                        {formatDate(contactData.callHistory.firstCallDate)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Contact not found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Unable to load contact information.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}