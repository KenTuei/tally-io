import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '../lib/utils';
import { useSync } from '../hooks/useSync';

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialise RxDB and background sync
  useSync();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-200',
        )}
      >
        {/* Top navigation bar */}
        <TopBar onMenuClick={() => setSidebarCollapsed((c) => !c)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
