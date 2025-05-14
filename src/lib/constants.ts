
import type { NavItem } from '@/types';
import { Sprout, ScanSearch, CalendarDays, Settings2, UserCircle } from 'lucide-react'; // Added UserCircle

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'My Plants',
    href: '/',
    icon: Sprout,
  },
  {
    title: 'Identify Plant',
    href: '/identify',
    icon: ScanSearch,
  },
  {
    title: 'Care Calendar',
    href: '/calendar',
    icon: CalendarDays,
  },
  {
    title: 'Profile', // Added Profile link
    href: '/profile',
    icon: UserCircle, 
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings2,
    disabled: false,
  },
];
