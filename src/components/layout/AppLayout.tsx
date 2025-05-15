
'use client';

import type { NavItem, NavItemConfig } from '@/types';
import React from 'react';
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
import { LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import { Skeleton } from '@/components/ui/skeleton';

interface AppLayoutProps {
  children: React.ReactNode;
  navItemsConfig: NavItemConfig[];
}

function LayoutContent({ children, navItemsConfig }: AppLayoutProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { t } = useLanguage();
  const { user, logout, isLoading: authIsLoading } = useAuth(); // Get user and logout from AuthContext
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const navItems: NavItem[] = React.useMemo(() => {
    return navItemsConfig.map(item => ({
      ...item,
      title: t(item.titleKey),
    }));
  }, [navItemsConfig, t]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout(); // logout is async in mock, might not be in real one
    setIsLoggingOut(false);
    // Navigation to /login is handled by AuthContext
  };

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
          {authIsLoading ? (
             <Skeleton className={cn("w-full h-10", isCollapsed ? "mx-auto w-10" : "")} />
          ) : user ? (
            <Button 
              variant="ghost" 
              className={cn("w-full", isCollapsed ? "justify-center" : "justify-start")}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              {!isCollapsed && !isLoggingOut && <span className="ml-2">Log Out</span>}
              {!isCollapsed && isLoggingOut && <span className="ml-2">Logging out...</span>}
            </Button>
          ) : null }
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}


export function AppLayout({ children, navItemsConfig }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent navItemsConfig={navItemsConfig}>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
}
