
'use client';

import { usePathname } from 'next/navigation';
import type { NavItemConfig } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import React from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle as DialogTitlePrimitive,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Settings, LogIn, Menu, Palette, Languages, UserCircle } from 'lucide-react';
import { ProgressBarLink } from './ProgressBarLink';
import { useIndexedDbImage } from '@/hooks/useIndexedDbImage';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';

const isActive = (itemHref: string, currentPathname: string): boolean => {
  if (itemHref === '/') {
    // "My Plants" is active for "/" or "/plants/*"
    return currentPathname === '/' || currentPathname.startsWith('/plants');
  }
  return currentPathname.startsWith(itemHref);
};

interface NavbarProps {
  // isStandalone prop is now handled internally by usePWAStandalone
}

export function Navbar({ }: NavbarProps) {
  const isStandalone = usePWAStandalone();
  const { user, isLoading: authIsLoading } = useAuth();
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false);

  const { imageUrl: userDisplayAvatarUrl, isLoading: isAvatarLoading } = useIndexedDbImage(
    user?.avatarUrl && !user.avatarUrl.startsWith('data:') && !user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : undefined,
    user?.id
  );

  const avatarSrc = userDisplayAvatarUrl ||
    (user?.avatarUrl && (user.avatarUrl.startsWith('data:') || user.avatarUrl.startsWith('http'))
      ? user.avatarUrl
      : `https://placehold.co/100x100.png?text=${(user?.name?.charAt(0) || 'U').toUpperCase()}`);


  const navItems: NavItemConfig[] = React.useMemo(() => {
    return APP_NAV_CONFIG.map(item => ({
      ...item,
      title: t(item.titleKey),
    }));
  }, [t]);

  const NavLinks = ({ isMobile = false, standaloneModeInternal = false }: { isMobile?: boolean, standaloneModeInternal?: boolean }) => (
    navItems.map((item) => {
      let title = item.title;
      if (standaloneModeInternal) {
        if (item.titleKey === 'nav.diagnosePlant') {
          title = t('nav.diagnoseShort');
        } else if (item.titleKey === 'nav.careCalendar') {
          title = t('nav.calendarShort');
        }
      }
      return (
        <ProgressBarLink
          key={item.href}
          href={item.disabled ? '#' : item.href}
          className={cn(
            "transition-colors ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            standaloneModeInternal
              ? "flex flex-col items-center justify-center gap-1 p-2 rounded-md text-xs h-full w-full"
              : "h-9 px-3 w-full justify-start md:w-auto md:justify-center inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
            isActive(item.href, pathname)
              ? standaloneModeInternal
                ? "text-primary"
                : "text-primary font-semibold bg-primary/10 hover:bg-primary/20"
              : standaloneModeInternal
                ? "text-muted-foreground hover:text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            item.disabled ? "pointer-events-none opacity-50" : ""
          )}
          onClick={() => {
            if (isMobile) setIsMobileMenuOpen(false);
          }}
        >
          {standaloneModeInternal ? <item.icon size={24} /> : <item.icon className="h-4 w-4" /> }
          <span className={cn(standaloneModeInternal && "mt-0.5 text-center")}>{title}</span>
        </ProgressBarLink>
      );
    })
  );

  const isProfileActive = pathname === '/profile';

  return (
    <header className={cn(
      "w-full z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      isStandalone ? "fixed bottom-0 left-0 right-0 border-t h-16" : "sticky top-0 border-b h-16"
    )}>
      <div className={cn(
        "flex items-center h-full container mx-auto",
        isStandalone ? "justify-around px-2" : "justify-between px-4 sm:px-6 lg:px-8"
      )}>
        {/* Top Navbar for Browser Mode */}
        {!isStandalone && (
          <>
            <div className="flex items-center gap-x-6">
              <Logo iconSize={90} />
              <nav className="hidden md:flex items-center gap-1">
                <NavLinks standaloneModeInternal={false} />
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">{t('nav.settings')}</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-0">
                    <SheetHeader className="p-4 border-b">
                       <SheetTitle>{t('nav.mobileMenuTitle')}</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-2 p-4">
                      <NavLinks isMobile={true} standaloneModeInternal={false} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {authIsLoading ? (
                <Skeleton className="h-9 w-9 rounded-full" />
              ) : user ? (
                <>
                  <ProgressBarLink href="/profile">
                    <Avatar
                      className={cn(
                        "h-9 w-9 cursor-pointer border-2 hover:border-primary transition-colors",
                        isProfileActive ? "border-primary" : "border-transparent"
                      )}
                    >
                      {isAvatarLoading ? (
                        <Skeleton className="h-full w-full rounded-full" />
                      ) : (
                        <AvatarImage src={avatarSrc} alt={user.name || "User"} data-ai-hint="person avatar" />
                      )}
                      <AvatarFallback className="text-sm bg-muted">
                        {(user.name || "U").split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </ProgressBarLink>

                  <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('nav.settings')}
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitlePrimitive className="flex items-center gap-2">
                          <Settings className="h-6 w-6 text-primary" />
                          {t('settings.title')}
                        </DialogTitlePrimitive>
                        <DialogDescription>
                          {t('settings.description')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
                          <div className='flex items-center gap-3'>
                            <Palette className="h-5 w-5 text-primary" />
                            <Label htmlFor="themePreference-dialog-top" className="text-base font-medium">
                              {t('settings.darkMode')}
                            </Label>
                          </div>
                          <Switch
                            id="themePreference-dialog-top"
                            checked={theme === 'dark'}
                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                            aria-label={t('settings.darkMode')}
                            disabled={authIsLoading}
                          />
                        </div>
                        <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
                          <div className="flex items-center gap-3 mb-2">
                            <Languages className="h-5 w-5 text-primary" />
                            <Label htmlFor="language-select-dialog-top" className="text-base font-medium">
                              {t('settings.language')}
                            </Label>
                          </div>
                          <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'vi')}>
                            <SelectTrigger id="language-select-dialog-top" className="w-full">
                              <SelectValue placeholder={t('settings.language')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">{t('common.english')}</SelectItem>
                              <SelectItem value="vi">{t('common.vietnamese')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            {t('common.close')}
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <ProgressBarLink href="/login" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9 px-3")}>
                  <LogIn className="h-5 w-5 mr-2" />
                  {t('loginPage.signInButton')}
                </ProgressBarLink>
              )}
            </div>
          </>
        )}

        {/* Bottom Navbar for PWA Standalone Mode */}
        {isStandalone && (
          <nav className="flex items-center justify-around w-full h-full">
            <NavLinks standaloneModeInternal={true} />
            {authIsLoading ? (
               <div className="flex flex-col items-center justify-center gap-1 p-2 rounded-md text-xs h-full w-full text-muted-foreground">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-10 mt-0.5" />
              </div>
            ) : user ? (
              <ProgressBarLink href="/profile" className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-md text-xs h-full w-full", isActive("/profile", pathname) ? "text-primary" : "text-muted-foreground hover:text-primary")}>
                <Avatar
                  className={cn(
                    "h-6 w-6 cursor-pointer border-2 hover:border-primary transition-colors", 
                    isActive("/profile", pathname) ? "border-primary" : "border-transparent"
                  )}
                >
                  {isAvatarLoading ? (
                    <Skeleton className="h-full w-full rounded-full" />
                  ) : (
                    <AvatarImage src={avatarSrc} alt={user.name || "User"} data-ai-hint="person avatar" />
                  )}
                  <AvatarFallback className="text-xs bg-muted">
                    {(user.name || "U").split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="mt-0.5 text-center">{t('nav.profile')}</span>
              </ProgressBarLink>
            ) : (
              <ProgressBarLink href="/login" className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-md text-xs h-full w-full", isActive("/login", pathname) ? "text-primary" : "text-muted-foreground hover:text-primary")}>
                <UserCircle size={24} />
                <span className="mt-0.5 text-center">{t('loginPage.signInButton')}</span>
              </ProgressBarLink>
            )}
            <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label={t('nav.settings')}
                  className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-md text-xs h-full w-full",
                    isSettingsDialogOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <Settings size={24} />
                  <span className="mt-0.5 text-center">{t('nav.settings')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitlePrimitive className="flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" />
                    {t('settings.title')}
                  </DialogTitlePrimitive>
                  <DialogDescription>
                    {t('settings.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
                    <div className='flex items-center gap-3'>
                      <Palette className="h-5 w-5 text-primary" />
                      <Label htmlFor="themePreference-dialog-standalone" className="text-base font-medium">
                        {t('settings.darkMode')}
                      </Label>
                    </div>
                    <Switch
                      id="themePreference-dialog-standalone"
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                      aria-label={t('settings.darkMode')}
                      disabled={authIsLoading}
                    />
                  </div>
                  <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Languages className="h-5 w-5 text-primary" />
                      <Label htmlFor="language-select-dialog-standalone" className="text-base font-medium">
                        {t('settings.language')}
                      </Label>
                    </div>
                    <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'vi')}>
                      <SelectTrigger id="language-select-dialog-standalone" className="w-full">
                        <SelectValue placeholder={t('settings.language')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t('common.english')}</SelectItem>
                        <SelectItem value="vi">{t('common.vietnamese')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      {t('common.close')}
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </nav>
        )}
      </div>
    </header>
  );
}

    