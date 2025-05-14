
'use client';

import type { NavItem } from '@/types';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Navbar } from './Navbar';
import { SidebarNav } from './SidebarNav';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageProgressBar } from './PageProgressBar'; // Added import

interface AppLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

function LayoutContent({ children, navItems }: AppLayoutProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader>
          {isCollapsed ? (
            <Logo iconSize={28} textSize="text-2xl" className="justify-center py-2"/>
          ) : (
            <Logo iconSize={32} textSize="text-3xl" className="px-2 py-2" />
          )}
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav navItems={navItems} isCollapsed={isCollapsed} />
        </SidebarContent>
        <SidebarFooter>
          <Button variant="ghost" className={cn("w-full", isCollapsed ? "justify-center" : "justify-start")}>
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Log Out</span>}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <PageProgressBar /> {/* Added PageProgressBar here */}
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}


export function AppLayout({ children, navItems }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent navItems={navItems}>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
}
