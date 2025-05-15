
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { NavItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Settings, LogIn, LogOut, Loader2, UserCircle } from 'lucide-react'; // Keep UserCircle for fallback if needed
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import React from 'react';

// Helper function to determine if a nav item should be active
const isActive = (itemHref: string, currentPathname: string): boolean => {
  if (itemHref === '/') {
    // "My Plants" is active on the homepage or any /plants/... sub-route
    return currentPathname === '/' || currentPathname.startsWith('/plants');
  }
  // Other items are active if the current path starts with their href
  return currentPathname.startsWith(itemHref);
};

export function Navbar() {
  const { user, logout, isLoading: authIsLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const router = useRouter();

  const navItems: NavItem[] = React.useMemo(() => {
    return APP_NAV_CONFIG.map(item => ({
      ...item,
      title: t(item.titleKey),
    }));
  }, [t]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* 
        Apply `container` for max-width, `mx-auto` for centering, 
        and `px-*` for horizontal padding.
        `justify-between` will then work within this padded, centered container.
      */}
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Group: Logo and Navigation Links */}
        <div className="flex items-center gap-x-6"> 
          <Logo iconSize={28} textSize="text-2xl" />
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn(
                  "transition-colors h-9 px-3",
                  isActive(item.href, pathname)
                    ? "text-primary font-semibold bg-primary/10 hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                disabled={item.disabled}
              >
                <Link href={item.disabled ? '#' : item.href}>
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
        
        {/* Mobile Nav Trigger (Placeholder for future dropdown/sheet menu) */}
        <div className="md:hidden">
           {/* Example: <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu /></Button></SheetTrigger> */}
        </div>

        {/* Right Group: User Actions */}
        <div className="flex items-center gap-2"> 
          {authIsLoading ? (
            <>
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-20" /> 
            </>
          ) : user ? (
            <>
              <Link href="/profile" passHref>
                <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent hover:border-primary transition-colors">
                  <AvatarImage src={user.avatarUrl || 'https://placehold.co/100x100.png'} alt={user.name} data-ai-hint="person avatar" />
                  <AvatarFallback className="text-sm bg-muted">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link href="/settings" passHref>
                <Button variant="ghost" size="icon" aria-label={t('nav.settings')}>
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log Out" 
              >
                {isLoggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </Button>
            </>
          ) : (
            <Link href="/login" passHref>
              <Button variant="ghost">
                <LogIn className="h-5 w-5 mr-2" />
                Sign In 
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
