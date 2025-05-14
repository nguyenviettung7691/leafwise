
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
  // { // Removed Profile from sidebar
  //   titleKey: 'nav.profile',
  //   href: '/profile',
  //   icon: UserCircle,
  // },
  // { // Removed Settings from sidebar
  //   titleKey: 'nav.settings',
  //   href: '/settings',
  //   icon: Settings2,
  //   disabled: false,
  // },
];

