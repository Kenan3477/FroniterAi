'use client';

import { useState, useEffect } from 'react';
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
  PhoneXMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function AdminSidebar({ 
  selectedSection, 
  onSectionChange, 
  collapsed,
  onToggle
}: AdminSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Flows']));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isKen, setIsKen] = useState(false);

  useEffect(() => {
    // Fetch current user information to check if it's Ken
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/profile', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setCurrentUser(data.user);
            // Check if user is Ken (Creator of Omnivox)
            const userIsKen = data.user.email === 'ken@simpleemails.co.uk';
            setIsKen(userIsKen);
            
            // Only expand Security section if user is Ken
            if (userIsKen) {
              setExpandedSections(new Set(['Flows', 'Security']));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  const handleSubSectionClick = (parentSection: string, subSection: string) => {
    onSectionChange(`${parentSection} - ${subSection}`);
  };

  // Filter admin sections based on user permissions
  const getAdminSections = () => {
    const baseSections = [
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
        name: 'Do Not Call (DNC)', 
        icon: PhoneXMarkIcon,
        description: 'Manage Do Not Call registry and compliance'
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

    // Only add Security section for Ken (Creator of Omnivox)
    if (isKen) {
      const securitySection = { 
        name: 'Security', 
        icon: ShieldCheckIcon,
        description: 'Security settings and IP whitelist management (Ken Only)',
        collapsible: true,
        subSections: [
          { name: 'Whitelisted IPs', icon: ShieldCheckIcon, description: 'Manage IP whitelist and access control (Ken Only)' }
        ]
      };

      // Insert Security section before User Management
      const userManagementIndex = baseSections.findIndex(section => section.name === 'User Management');
      baseSections.splice(userManagementIndex, 0, securitySection);
    }

    return baseSections;
  };

  const handleSectionClick = (sectionName: string) => {
    const sections = getAdminSections();
    const section = sections.find((s) => s.name === sectionName);
    if (!section) return;

    const subCount = section.subSections?.length ?? 0;

    // Collapsed rail: sub-items are hidden — navigate directly when there is only one,
    // or expand the sidebar when a section has multiple children.
    if (collapsed) {
      if (section.collapsible && subCount === 1 && section.subSections) {
        handleSubSectionClick(section.name, section.subSections[0].name);
        setExpandedSections((prev) => new Set(prev).add(section.name));
        return;
      }
      if (section.collapsible && subCount > 1) {
        onToggle();
        setExpandedSections((prev) => new Set(prev).add(section.name));
        onSectionChange(sectionName);
        return;
      }
      onSectionChange(sectionName);
      return;
    }

    if (section.collapsible) {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        if (next.has(sectionName)) next.delete(sectionName);
        else next.add(sectionName);
        return next;
      });
      onSectionChange(sectionName);
    } else {
      onSectionChange(sectionName);
    }
  };

  const adminSections = getAdminSections();

  return (
    <div
      className={`${collapsed ? 'w-16' : 'w-72'} bg-white border-r border-gray-200 flex flex-col h-full min-h-0 transition-all duration-300`}
    >
      {/* Expand / collapse — sticky at top so it stays reachable when the nav scrolls */}
      <div className="shrink-0 border-b border-gray-200 p-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand admin menu' : 'Collapse admin menu'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="w-full flex items-center justify-center gap-2 p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors duration-150"
        >
          {collapsed ? (
            <>
              <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="sr-only">Expand menu</span>
            </>
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Header */}
          <div className="shrink-0 p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
            <p className="text-sm text-gray-500 mt-1">System management and configuration</p>
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2">
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
        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <div className="space-y-2 px-1">
            {adminSections.map((section) => {
              const IconComponent = section.icon;
              const isCollapsedSelected =
                section.name === selectedSection ||
                selectedSection.startsWith(`${section.name} - `);
              const subs = section.subSections ?? [];
              const title =
                collapsed && section.collapsible && subs.length === 1
                  ? `${section.name} — ${subs[0].name}`
                  : section.name;
              return (
                <button
                  key={section.name}
                  type="button"
                  onClick={() => handleSectionClick(section.name)}
                  className={`w-full flex items-center justify-center p-3 text-sm transition-colors relative group rounded-md hover:bg-gray-50 ${
                    isCollapsedSelected
                      ? 'bg-blue-50 text-blue-600 before:absolute before:right-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={title}
                >
                  <IconComponent className="h-5 w-5" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}