
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter
import type { NavItem } from '@/types';
import { Button } from '@/components/ui/button';
import { UserCircle, Settings, LogIn, LogOut, Loader2 } from 'lucide-react'; // Added LogOut, Loader2
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { APP_NAV_CONFIG } from '@/lib/constants'; // Import nav config
import { useLanguage } from '@/context/LanguageContext'; // Import useLanguage
import { cn } from '@/lib/utils';
import React from 'react'; // Added React for useState and useMemo

export function Navbar() {
  const { user, logout, isLoading: authIsLoading } = useAuth(); // Renamed isLoading to authIsLoading for clarity
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
    // Navigation to /login is handled by AuthContext or router can be used here if needed
    setIsLoggingOut(false);
    router.push('/login'); // Ensure redirection
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-4"> {/* Increased gap */}
          <Logo iconSize={28} textSize="text-2xl" />
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn(
                  "transition-colors h-9 px-3",
                  (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
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
        
        {/* Mobile Nav Trigger (placeholder for potential future dropdown) */}
        <div className="md:hidden">
           {/* Can add a dropdown menu trigger here for mobile */}
        </div>

        <div className="flex items-center gap-3">
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
                <Button variant="ghost" size="icon" aria-label="Settings">
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
