
import type { NavItemConfig } from '@/types';
import { Sprout, ScanSearch, CalendarDays, Settings2, UserCircle } from 'lucide-react';

// NAV_ITEMS is now APP_NAV_CONFIG and uses titleKey for translation
export const APP_NAV_CONFIG: NavItemConfig[] = [
  {
    titleKey: 'nav.myPlants',
    href: '/',
    icon: Sprout,
  },
  {
    titleKey: 'nav.identifyPlant',
    href: '/identify',
    icon: ScanSearch,
  },
  {
    titleKey: 'nav.careCalendar',
    href: '/calendar',
    icon: CalendarDays,
  },
  {
    titleKey: 'nav.profile',
    href: '/profile',
    icon: UserCircle,
  },
  {
    titleKey: 'nav.settings',
    href: '/settings',
    icon: Settings2,
    disabled: false,
  },
];
