
import type { NavItemConfig } from '@/types';
import { Sprout, ScanSearch, CalendarDays, Settings2, UserCircle, Stethoscope } from 'lucide-react'; // Added Stethoscope

// NAV_ITEMS is now APP_NAV_CONFIG and uses titleKey for translation
export const APP_NAV_CONFIG: NavItemConfig[] = [
  {
    titleKey: 'nav.myPlants',
    href: '/',
    icon: Sprout,
  },
  // { // Removed Identify Plant
  //   titleKey: 'nav.identifyPlant',
  //   href: '/identify',
  //   icon: ScanSearch,
  // },
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
