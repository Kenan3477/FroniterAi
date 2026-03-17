'use client';

import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ArrowLeftIcon,
  PlusIcon,
  TableCellsIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface DataManagementSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const dataManagementSections = [
  { 
    name: 'Back to Admin', 
    icon: ArrowLeftIcon,
    description: 'Return to admin panel',
    isBack: true
  },
  { 
    name: 'Create Data Lists', 
    icon: PlusIcon,
    description: 'Create new data lists'
  },
  { 
    name: 'Manage Data Lists', 
    icon: TableCellsIcon,
    description: 'View and manage existing data lists'
  },
  { 
    name: 'Data Autoload', 
    icon: ArrowPathIcon,
    description: 'Configure automated data loading'
  },
];

export default function DataManagementSidebar({ 
  selectedSection, 
  onSectionChange, 
  collapsed,
  onToggle
}: DataManagementSidebarProps) {

  const handleSectionClick = (sectionName: string) => {
    if (sectionName === 'Back to Admin') {
      // Navigate back to admin page
      window.location.href = '/admin';
      return;
    }
    onSectionChange(sectionName);
  };

  return (
    <div className={`${collapsed ? 'w-16' : 'w-72'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {!collapsed && (
        <>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage data sources and lists</p>
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto py-2">
            <div className="space-y-1">
              {dataManagementSections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <button
                    key={section.name}
                    onClick={() => handleSectionClick(section.name)}
                    className={`w-full flex items-start px-4 py-3 text-sm transition-colors relative group hover:bg-gray-50 ${
                      section.name === selectedSection 
                        ? 'bg-blue-50 text-blue-900 font-medium before:absolute before:right-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-600' 
                        : section.isBack
                        ? 'text-gray-600 border-b border-gray-100'
                        : 'text-gray-700'
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                      section.name === selectedSection 
                        ? 'text-blue-600' 
                        : section.isBack
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                    <div className="text-left">
                      <div className={section.isBack ? 'text-gray-600' : 'font-medium'}>
                        {section.name}
                      </div>
                      {!section.isBack && (
                        <div className={`text-xs mt-1 ${
                          section.name === selectedSection ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          {section.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Collapsed State */}
      {collapsed && (
        <div className="flex-1 py-4">
          <div className="space-y-2">
            {dataManagementSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <button
                  key={section.name}
                  onClick={() => handleSectionClick(section.name)}
                  className={`w-full flex items-center justify-center p-3 text-sm transition-colors relative group hover:bg-gray-50 ${
                    section.name === selectedSection 
                      ? 'bg-blue-50 text-blue-600 before:absolute before:right-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={section.name}
                >
                  <IconComponent className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>
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