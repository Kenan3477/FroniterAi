'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface WorkSidebarProps {
  selectedView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  outcomedInteractionsCount?: number;
  activeInteractionsCount?: number;
  queuedInteractionsCount?: number;
  unallocatedInteractionsCount?: number;
  tasksCount?: number;
}

export default function WorkSidebar({ 
  selectedView, 
  onViewChange, 
  collapsed,
  onToggle,
  outcomedInteractionsCount = 0,
  activeInteractionsCount = 0,
  queuedInteractionsCount = 0,
  unallocatedInteractionsCount = 0,
  tasksCount = 0,
}: WorkSidebarProps) {
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const views = [
    { name: 'Queued Interactions', count: queuedInteractionsCount },
    { name: 'Unallocated Interactions', count: unallocatedInteractionsCount },
    { name: 'Outcomed Interactions', count: outcomedInteractionsCount },
    { name: 'Sent Interactions', count: 0 },
    { name: 'Tasks', count: tasksCount },
  ];

  const myInteractions = [
    { name: 'My Interactions', count: activeInteractionsCount },
  ];

  return (
    <div className={`${collapsed ? 'w-16' : 'w-72'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {!collapsed && (
        <>
          {/* Main Views Dropdown - This should show "My Interactions" or "Views" as top level */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <button
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span>Views</span>
                <ChevronDownIcon 
                  className={`h-4 w-4 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showViewDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    My Interactions
                  </div>
                  {myInteractions.map((interaction) => (
                    <button
                      key={interaction.name}
                      onClick={() => {
                        onViewChange(interaction.name);
                        setShowViewDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 ${
                        interaction.name === selectedView ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      <span>{interaction.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        interaction.name === selectedView 
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {interaction.count}
                      </span>
                    </button>
                  ))}
                  
                  <div className="border-t border-gray-100 mt-1">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Views
                    </div>
                    {views.map((view) => (
                      <button
                        key={view.name}
                        onClick={() => {
                          onViewChange(view.name);
                          setShowViewDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 ${
                          view.name === selectedView ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        <span>{view.name}</span>
                        {view.count !== null && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            view.name === selectedView 
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {view.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current View Display */}
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-4 py-3">
              <h3 className="text-sm font-medium text-gray-900 mb-3">{selectedView}</h3>
              <div className="text-sm text-gray-500">
                {selectedView === 'My Interactions' && 
                  (activeInteractionsCount > 0 
                    ? `${activeInteractionsCount} active interaction${activeInteractionsCount !== 1 ? 's' : ''}` 
                    : 'No active interactions - start a call to see interactions here'
                  )
                }
                {selectedView === 'Queued Interactions' && 
                  (queuedInteractionsCount > 0 
                    ? `${queuedInteractionsCount} queued interaction${queuedInteractionsCount !== 1 ? 's' : ''}` 
                    : 'No queued interactions - callbacks will appear here'
                  )
                }
                {selectedView === 'Unallocated Interactions' && 
                  (unallocatedInteractionsCount > 0 
                    ? `${unallocatedInteractionsCount} unallocated interaction${unallocatedInteractionsCount !== 1 ? 's' : ''}` 
                    : 'No unallocated interactions - interactions needing follow-up appear here'
                  )
                }
                {selectedView === 'Outcomed Interactions' && 
                  (outcomedInteractionsCount > 0 
                    ? `${outcomedInteractionsCount} completed interaction${outcomedInteractionsCount !== 1 ? 's' : ''}` 
                    : 'No completed interactions yet'
                  )
                }
                {selectedView === 'Sent Interactions' && 'No sent interactions'}
                {selectedView === 'Tasks' && 
                  (tasksCount > 0 
                    ? `${tasksCount} pending task${tasksCount !== 1 ? 's' : ''}` 
                    : 'No pending tasks'
                  )
                }
              </div>
            </div>
          </div>

          {/* Collapse Toggle */}
          <div className="border-t border-gray-200 p-3">
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors duration-150"
            >
              {collapsed ? (
                <ChevronRightIcon className="h-5 w-5" />
              ) : (
                <div className="flex items-center space-x-2">
                  <ChevronLeftIcon className="h-5 w-5" />
                  <span className="text-sm">Collapse</span>
                </div>
              )}
            </button>
          </div>
        </>
      )}

      {/* Collapse Toggle */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors duration-150"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <div className="flex items-center space-x-2">
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="text-sm">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}