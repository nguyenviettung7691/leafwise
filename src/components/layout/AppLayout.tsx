
'use client';

import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isStandalone = usePWAStandalone();

  return (
    <div className="flex flex-col min-h-svh bg-background">
      {!isStandalone && <Navbar/>}
      <main
        className={cn(
          "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full",
          isStandalone && "pb-20" // Add padding for bottom navbar
        )}
      >
        {children}
      </main>
      {isStandalone && <Navbar/>}
    </div>
  );
}
