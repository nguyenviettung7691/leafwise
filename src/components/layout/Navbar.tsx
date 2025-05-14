import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserCircle, Settings } from 'lucide-react';
import { Logo } from './Logo';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <div className="hidden md:block">
            <Logo iconSize={28} textSize="text-2xl" />
          </div>
        </div>
         <div className="md:hidden">
            <Logo iconSize={24} textSize="text-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="User Account">
            <UserCircle className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
