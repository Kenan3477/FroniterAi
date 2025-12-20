'use client';

import { 
  PhoneIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon
} from '@heroicons/react/24/outline';

interface InteractionData {
  id: string;
  agentName: string;
  customerName: string;
  interactionType: 'call' | 'email' | 'sms' | 'chat';
  telephone: string;
  direction: 'inbound' | 'outbound';
  subject: string;
  campaignName: string;
  outcome: string;
  dateTime: string;
  duration: string;
}

interface InteractionTableProps {
  data: InteractionData[];
  section: string;
  searchTerm: string;
}

export default function InteractionTable({ data, section, searchTerm }: InteractionTableProps) {
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <PhoneIcon className="h-4 w-4 text-slate-600" />;
      case 'email':
        return <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs">@</div>;
      case 'sms':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs">💬</div>;
      default:
        return <PhoneIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'outbound' 
      ? <ArrowUpRightIcon className="h-4 w-4 text-red-600" />
      : <ArrowDownLeftIcon className="h-4 w-4 text-slate-600" />;
  };

  const getOutcomeBadge = (outcome: string) => {
    const badges = {
      'Answering Machine': 'bg-yellow-100 text-yellow-800',
      'Not Interested - NI': 'bg-red-100 text-red-800',
      'Interested': 'bg-green-100 text-slate-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
      'Connected': 'bg-blue-100 text-blue-800',
      'Callback': 'bg-purple-100 text-purple-800'
    };
    
    return badges[outcome as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const filteredData = data.filter(item =>
    item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.telephone.includes(searchTerm) ||
    item.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.outcome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No interactions found</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your filters or search terms
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <div className="grid grid-cols-10 gap-4 px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
            <div className="col-span-1">Agent Name</div>
            <div className="col-span-1">Customer Name</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Telephone</div>
            <div className="col-span-1">Direction</div>
            <div className="col-span-1">Subject</div>
            <div className="col-span-2">Campaign Name</div>
            <div className="col-span-1">Outcome</div>
            <div className="col-span-1">Date/Time</div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto divide-y divide-gray-100" style={{ height: 'calc(100vh - 320px)' }}>
          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2">
                  {section === 'My Interactions' ? (
                    <div>
                      <PhoneIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Interactions</h3>
                      <p className="text-gray-500">Start a call to see interactions here</p>
                    </div>
                  ) : section === 'Outcomed Interactions' ? (
                    <div>
                      <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <PhoneIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Call History Yet</h3>
                      <p className="text-gray-500">Complete calls will appear here with outcomes and statistics</p>
                      <p className="text-sm text-gray-400 mt-2">Start making calls to build your interaction history</p>
                    </div>
                  ) : (
                    <div>
                      <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No interactions found</h3>
                      <p className="text-gray-500">Try adjusting your filters or search terms</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            filteredData.map((item, index) => (
              <div 
                key={item.id} 
                className={`grid grid-cols-10 gap-4 px-6 py-4 text-sm hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                }`}
              >
                {/* Agent Name */}
                <div className="col-span-1">
                  <span className="font-medium text-gray-900">{item.agentName}</span>
                </div>

                {/* Customer Name */}
                <div className="col-span-1">
                  <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors text-left">
                    {item.customerName}
                  </button>
                </div>

                {/* Interaction Type */}
                <div className="col-span-1 flex items-center">
                  {getInteractionIcon(item.interactionType)}
                </div>

                {/* Telephone */}
                <div className="col-span-1">
                  <span className="text-gray-900 font-mono text-sm">{item.telephone}</span>
                </div>

                {/* Direction */}
                <div className="col-span-1 flex items-center">
                  {getDirectionIcon(item.direction)}
                </div>

                {/* Subject */}
                <div className="col-span-1">
                  <span className="text-gray-700">{item.subject || '-'}</span>
                </div>

                {/* Campaign Name */}
                <div className="col-span-2">
                  <span className="text-gray-900">{item.campaignName}</span>
                </div>

                {/* Outcome */}
                <div className="col-span-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getOutcomeBadge(item.outcome)}`}>
                    {item.outcome}
                  </span>
                </div>

                {/* Date/Time */}
                <div className="col-span-1">
                  <div className="text-gray-900 text-sm">
                    {item.dateTime}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {item.duration}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between rounded-b-lg">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Rows per page:
            </span>
            <select className="border border-gray-300 rounded-md text-sm px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>100</option>
              <option>50</option>
              <option>25</option>
              <option>10</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {filteredData.length > 0 ? `1-${Math.min(10, filteredData.length)}` : '0-0'} of {filteredData.length}
            </span>
            <div className="flex items-center space-x-1">
              <button 
                className="p-2 rounded-md border border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={true}
              >
                <span className="sr-only">Previous page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                className="p-2 rounded-md border border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={true}
              >
                <span className="sr-only">Next page</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}