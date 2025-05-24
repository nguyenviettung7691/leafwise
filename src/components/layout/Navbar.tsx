
'use client';

import { usePathname } from 'next/navigation';
import type { NavItem } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button'; // Added buttonVariants
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
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Settings, LogIn, Menu, Palette, Languages } from 'lucide-react';
import { ProgressBarLink } from './ProgressBarLink';
import { useIndexedDbImage } from '@/hooks/useIndexedDbImage'; // Import the hook

const isActive = (itemHref: string, currentPathname: string): boolean => {
  if (itemHref === '/') {
    return currentPathname === '/' || currentPathname.startsWith('/plants');
  }
  return currentPathname.startsWith(itemHref);
};

export function Navbar() {
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


  const navItems: NavItem[] = React.useMemo(() => {
    return APP_NAV_CONFIG.map(item => ({
      ...item,
      title: t(item.titleKey),
    }));
  }, [t]);

  const NavLinks = ({isMobile = false}: {isMobile?: boolean}) => (
    navItems.map((item) => (
      <ProgressBarLink
        key={item.href}
        href={item.disabled ? '#' : item.href}
        className={cn(
          "transition-colors h-9 px-3 w-full justify-start md:w-auto md:justify-center inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive(item.href, pathname)
            ? "text-primary font-semibold bg-primary/10 hover:bg-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          item.disabled ? "pointer-events-none opacity-50" : ""
        )}
        onClick={() => {
          if (isMobile) setIsMobileMenuOpen(false);
        }}
      >
        <item.icon className="h-4 w-4 mr-0" />
        {item.title}
      </ProgressBarLink>
    ))
  );

  const isProfileActive = pathname === '/profile';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-x-6">
          <Logo iconSize={28} textSize="text-2xl" iconColorClassName="text-primary" textColorClassName="text-foreground"/>
          <nav className="hidden md:flex items-center gap-1">
            <NavLinks />
          </nav>
        </div>

        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t('nav.settings')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0"> {/* Changed p-4 to p-0 to allow header to span full width */}
              <SheetHeader className="p-4 border-b"> {/* Added SheetHeader */}
                <SheetTitle asChild> {/* Use asChild if Logo contains its own h-level tag or is complex */}
                    <SheetClose asChild>
                         <Logo iconSize={24} textSize="text-xl" />
                    </SheetClose>
                </SheetTitle>
                {/* <SheetDescription className="sr-only">Main navigation menu</SheetDescription> Optionally add a description */}
              </SheetHeader>
              <div className="flex flex-col gap-2 p-4"> {/* Added p-4 here for content padding */}
                <NavLinks isMobile={true} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-2">
          {authIsLoading ? (
            <>
              <Skeleton className="h-9 w-9 rounded-full" />
            </>
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
                  <Button variant="ghost" size="icon" aria-label={t('nav.settings')}>
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
                          <Label htmlFor="themePreference-dialog" className="text-base font-medium">
                          {t('settings.darkMode')}
                          </Label>
                      </div>
                      <Switch
                          id="themePreference-dialog"
                          checked={theme === 'dark'}
                          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                          aria-label={t('settings.darkMode')}
                          disabled={authIsLoading}
                      />
                    </div>
                    <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
                      <div className="flex items-center gap-3 mb-2">
                        <Languages className="h-5 w-5 text-primary" />
                        <Label htmlFor="language-select-dialog" className="text-base font-medium">
                          {t('settings.language')}
                        </Label>
                      </div>
                      <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'vi')}>
                        <SelectTrigger id="language-select-dialog" className="w-full">
                          <SelectValue placeholder={t('settings.language')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">{t('common.english')}</SelectItem>
                          <SelectItem value="vi">{t('common.vietnamese')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-h-[100px] flex items-center justify-center border-2 border-dashed border-border rounded-md p-4">
                      <p
                        className="text-muted-foreground text-sm text-center"
                        dangerouslySetInnerHTML={{ __html: t('settings.featureInProgress') }}
                      />
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
            <ProgressBarLink href="/login" className={cn(buttonVariants({variant: "default", size: "sm"}), "h-9 px-3")}>
              <LogIn className="h-5 w-5 mr-2" />
              {t('loginPage.signInButton')}
            </ProgressBarLink>
          )}
        </div>
      </div>
    </header>
  );
}
