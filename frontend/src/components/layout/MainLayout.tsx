'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import InboundCallPopup from '@/components/ui/InboundCallPopup';
import { ContactsProvider } from '@/contexts/ContactsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <ThemeProvider>
      <ContactsProvider>
        <div className="h-screen flex theme-bg-secondary min-h-0">
          {/* Sidebar: shrink-0 so flex never collapses the nav column to zero width */}
          <div className="shrink-0 flex min-h-0">
            <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header onSidebarToggle={toggleSidebar} />
            <main className="flex-1 overflow-auto p-6 theme-bg-secondary">{children}</main>
          </div>

          {/* Global Inbound Call Popup - visible on all pages */}
          <InboundCallPopup />
        </div>
      </ContactsProvider>
    </ThemeProvider>
  );
}