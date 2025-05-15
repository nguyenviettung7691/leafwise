
'use client';

import type { NavItemConfig } from '@/types'; // Keep for potential future use if pages need to customize something
import React from 'react';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: React.ReactNode;
  // navItemsConfig is no longer directly used here to pass to sidebar
  // but kept in case some pages might want to influence layout in other ways.
  // For current nav, Navbar will fetch APP_NAV_CONFIG directly.
  navItemsConfig?: NavItemConfig[]; 
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-svh">
      <Navbar />
      {/* Added max-w-7xl and mx-auto to center and constrain the main content width */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
