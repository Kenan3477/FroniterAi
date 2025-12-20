'use client';

interface DataList {
  id: string;
  name: string;
  description: string;
  campaign: string;
  total: number;
  available: number;
}

interface DataListTableProps {
  data: DataList[];
  searchTerm: string;
}

export default function DataListTable({ data, searchTerm }: DataListTableProps) {
  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.campaign.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-gray-50">
      <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 m-4">
        {/* Table Header */}
        <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="grid grid-cols-6 gap-4 px-6 py-3 text-sm font-medium text-gray-900 uppercase tracking-wide">
            <div className="col-span-1">ID</div>
            <div className="col-span-1">Name</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">Campaign</div>
            <div className="col-span-1 grid grid-cols-2 gap-2">
              <div>Total</div>
              <div>Available</div>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 320px)' }}>
          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Lists Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No data lists match your search criteria.' : 'Create your first data list to get started.'}
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                  Create Data List
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredData.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-sm hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  {/* ID */}
                  <div className="col-span-1">
                    <span className="font-medium text-gray-900">{item.id}</span>
                  </div>

                  {/* Name */}
                  <div className="col-span-1">
                    <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors text-left">
                      {item.name}
                    </button>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <span className="text-gray-700">{item.description}</span>
                  </div>

                  {/* Campaign */}
                  <div className="col-span-1">
                    <div className="flex items-center">
                      <span className="text-gray-900">{item.campaign}</span>
                      <button className="ml-2 text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Total and Available */}
                  <div className="col-span-1 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-900 font-medium">{item.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium">{item.available}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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