
import type { NavItemConfig } from '@/types';
import { Sprout, CalendarDays, Stethoscope } from 'lucide-react';

// NAV_ITEMS is now APP_NAV_CONFIG and uses titleKey for translation
export const APP_NAV_CONFIG: NavItemConfig[] = [
  {
    titleKey: 'nav.myPlants',
    href: '/',
    icon: Sprout,
  },
  { 
    titleKey: 'nav.diagnosePlant', 
    href: '/diagnose',
    icon: Stethoscope,
  },
  {
    titleKey: 'nav.careCalendar',
    href: '/calendar',
    icon: CalendarDays,
  },
];

export const APP_VERSION_CODENAME = "0.3.9-sapling-kodama";
