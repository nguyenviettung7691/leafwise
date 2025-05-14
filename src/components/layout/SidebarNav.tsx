'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/types';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarNavProps {
  navItems: NavItem[];
  isCollapsed?: boolean; // Optional: to adjust behavior when sidebar is collapsed
}

export function SidebarNav({ navItems, isCollapsed }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {isCollapsed ? (
             <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                    aria-disabled={item.disabled}
                    disabled={item.disabled}
                    className="justify-center"
                  >
                    <Link href={item.disabled ? '#' : item.href}>
                      <item.icon className="h-5 w-5" />
                       <span className="sr-only">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
          ) : (
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
              aria-disabled={item.disabled}
              disabled={item.disabled}
            >
              <Link href={item.disabled ? '#' : item.href}>
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
