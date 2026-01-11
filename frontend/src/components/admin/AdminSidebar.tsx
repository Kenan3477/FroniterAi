'use client';

import { useState } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  KeyIcon,
  BoltIcon,
  BuildingOfficeIcon,
  MegaphoneIcon,
  Squares2X2Icon,
  CircleStackIcon,
  ArrowPathIcon,
  InboxStackIcon,
  ClockIcon,
  UsersIcon,
  EyeIcon,
  ListBulletIcon,
  ChartBarIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const adminSections = [
  { 
    name: 'Admin', 
    icon: CogIcon,
    description: 'Main administration panel'
  },
  { 
    name: 'API', 
    icon: KeyIcon,
    description: 'Configure API keys and endpoints'
  },
  { 
    name: 'Apps and Integrations', 
    icon: BoltIcon,
    description: 'Manage third-party integrations and apps'
  },
  { 
    name: 'Business Settings', 
    icon: BuildingOfficeIcon,
    description: 'Configure business and organization settings'
  },
  { 
    name: 'Campaigns', 
    icon: MegaphoneIcon,
    description: 'Manage marketing and sales campaigns'
  },
  { 
    name: 'Channels', 
    icon: Squares2X2Icon,
    description: 'Configure communication channels'
  },
  { 
    name: 'Data Management', 
    icon: CircleStackIcon,
    description: 'Manage data sources and databases'
  },
  { 
    name: 'Flows', 
    icon: ArrowPathIcon,
    description: 'Configure workflow automation and flows',
    collapsible: true,
    subSections: [
      { name: 'Manage Flows', icon: ListBulletIcon, description: 'Create and manage automation flows' },
      { name: 'Automation Flow Summaries', icon: ChartBarIcon, description: 'View flow analytics and summaries' }
    ]
  },
  { 
    name: 'Inbound Queues', 
    icon: InboxStackIcon,
    description: 'Manage inbound call and message queues'
  },
  { 
    name: 'SLAs', 
    icon: ClockIcon,
    description: 'Configure service level agreements'
  },
  { 
    name: 'User Management', 
    icon: UsersIcon,
    description: 'Manage user accounts and permissions'
  },
  { 
    name: 'Views', 
    icon: EyeIcon,
    description: 'Configure dashboard views and layouts'
  },
];

export default function AdminSidebar({ 
  selectedSection, 
  onSectionChange, 
  collapsed,
  onToggle
}: AdminSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Flows']));

  const handleSectionClick = (sectionName: string) => {
    const section = adminSections.find(s => s.name === sectionName);
    
    if (section?.collapsible) {
      // Toggle expanded state for collapsible sections
      setExpandedSections(prev => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(sectionName)) {
          newExpanded.delete(sectionName);
        } else {
          newExpanded.add(sectionName);
        }
        return newExpanded;
      });
      
      // Always select the section when clicked
      onSectionChange(sectionName);
    } else {
      onSectionChange(sectionName);
    }
  };

  const handleSubSectionClick = (parentSection: string, subSection: string) => {
    onSectionChange(`${parentSection} - ${subSection}`);
  };

  return (
    <div className={`${collapsed ? 'w-16' : 'w-72'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {!collapsed && (
        <>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
            <p className="text-sm text-gray-500 mt-1">System management and configuration</p>
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto py-2">
            <div className="space-y-1">
              {adminSections.map((section) => {
                const IconComponent = section.icon;
                const isExpanded = expandedSections.has(section.name);
                const isSelected = section.name === selectedSection || selectedSection.startsWith(section.name + ' - ');
                
                return (
                  <div key={section.name}>
                    {/* Main section button */}
                    <button
                      onClick={() => handleSectionClick(section.name)}
                      className={`w-full flex items-start px-4 py-3 text-sm transition-colors relative group hover:bg-gray-50 ${
                        isSelected 
                          ? 'bg-blue-50 text-blue-900 font-medium before:absolute before:right-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-600' 
                          : 'text-gray-700'
                      }`}
                    >
                      <IconComponent className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                        isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`} />
                      <div className="text-left flex-1">
                        <div className="font-medium">{section.name}</div>
                        <div className={`text-xs mt-1 ${
                          isSelected ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          {section.description}
                        </div>
                      </div>
                      {section.collapsible && (
                        <div className="ml-2 mt-0.5">
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      )}
                    </button>
                    
                    {/* Sub-sections (when expanded) */}
                    {section.collapsible && isExpanded && section.subSections && (
                      <div className="ml-8 mt-1 mb-2 space-y-1">
                        {section.subSections.map((subSection) => {
                          const SubIconComponent = subSection.icon;
                          const isSubSelected = selectedSection === `${section.name} - ${subSection.name}`;
                          
                          return (
                            <button
                              key={subSection.name}
                              onClick={() => handleSubSectionClick(section.name, subSection.name)}
                              className={`w-full flex items-start px-3 py-2 text-sm transition-colors group hover:bg-gray-50 rounded-md ${
                                isSubSelected 
                                  ? 'bg-blue-100 text-blue-900 font-medium' 
                                  : 'text-gray-600'
                              }`}
                            >
                              <SubIconComponent className={`h-4 w-4 mr-3 mt-0.5 flex-shrink-0 ${
                                isSubSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                              }`} />
                              <div className="text-left">
                                <div className="font-medium text-xs">{subSection.name}</div>
                                <div className={`text-xs mt-0.5 ${
                                  isSubSelected ? 'text-blue-700' : 'text-gray-500'
                                }`}>
                                  {subSection.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
            {adminSections.map((section) => {
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